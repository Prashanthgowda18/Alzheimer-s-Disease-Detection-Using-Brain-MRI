-- 1. Create Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor');
CREATE TYPE public.prediction_status AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE public.gender AS ENUM ('male', 'female', 'other');

-- 2. Enable UUID generation extension (usually enabled, but safe)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Create Profiles Table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    hospital_name TEXT,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notification_prefs JSONB NOT NULL DEFAULT '{"email": true, "in_app": true}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create User Roles Table
CREATE TABLE public.user_roles (
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE,
    role public.app_role NOT NULL,
    PRIMARY KEY (user_id, role),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Patients Table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    patient_id TEXT NOT NULL, -- MRN / custom ID
    patient_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender public.gender NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (doctor_id, patient_id)
);

-- 6. Create Predictions Table
CREATE TABLE public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients ON DELETE CASCADE NOT NULL,
    image_path TEXT NOT NULL,
    stage TEXT,
    confidence NUMERIC(5,4) CHECK (confidence >= 0 AND confidence <= 1),
    confidence_level TEXT,
    recommendation_api TEXT,
    recommendation_display TEXT,
    processing_ms INTEGER,
    model_name TEXT,
    model_version TEXT,
    probabilities JSONB,
    probability_warning BOOLEAN DEFAULT false,
    status public.prediction_status DEFAULT 'queued'::public.prediction_status NOT NULL,
    error_message TEXT,
    request_id UUID NOT NULL,
    heatmap_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    request_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create ML Health Pings Table
CREATE TABLE public.ml_health_pings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ok BOOLEAN NOT NULL,
    response_ms INTEGER,
    model TEXT,
    version TEXT,
    error TEXT
);

-- 10. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_health_pings ENABLE ROW LEVEL SECURITY;

-- 11. Create Security Definer Role Helper function
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, required_role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = user_uuid AND user_roles.role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Create RLS Policies
-- Profiles Policies
CREATE POLICY select_profiles ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY update_profiles ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- User Roles Policies
CREATE POLICY select_user_roles ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Patients Policies
CREATE POLICY all_patients ON public.patients FOR ALL
    USING (doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Predictions Policies
CREATE POLICY all_predictions ON public.predictions FOR ALL
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Notifications Policies
CREATE POLICY all_notifications ON public.notifications FOR ALL
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Audit Logs Policies
CREATE POLICY select_audit_logs ON public.audit_logs FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY insert_audit_logs ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ML Health Pings Policies
CREATE POLICY select_ml_health_pings ON public.ml_health_pings FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY admin_ml_health_pings ON public.ml_health_pings FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- 13. Create Database Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON public.predictions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Create Auth Trigger for new user signup auto-profiles creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, hospital_name, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'hospital_name', ''),
        true
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'doctor'::public.app_role);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. Create Atomic Finalize Prediction RPC function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.finalize_prediction(
    p_prediction_id UUID,
    p_stage TEXT,
    p_confidence NUMERIC,
    p_confidence_level TEXT,
    p_recommendation_api TEXT,
    p_recommendation_display TEXT,
    p_processing_ms INTEGER,
    p_model_name TEXT,
    p_model_version TEXT,
    p_probabilities JSONB,
    p_probability_warning BOOLEAN,
    p_heatmap_path TEXT
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_patient_id UUID;
    v_patient_name TEXT;
    v_request_id UUID;
BEGIN
    -- Fetch target details
    SELECT user_id, patient_id, request_id INTO v_user_id, v_patient_id, v_request_id
    FROM public.predictions
    WHERE id = p_prediction_id;

    SELECT patient_name INTO v_patient_name
    FROM public.patients
    WHERE id = v_patient_id;

    -- Update prediction row
    UPDATE public.predictions
    SET
        stage = p_stage,
        confidence = p_confidence,
        confidence_level = p_confidence_level,
        recommendation_api = p_recommendation_api,
        recommendation_display = p_recommendation_display,
        processing_ms = p_processing_ms,
        model_name = p_model_name,
        model_version = p_model_version,
        probabilities = p_probabilities,
        probability_warning = p_probability_warning,
        heatmap_path = p_heatmap_path,
        status = 'completed'::public.prediction_status,
        updated_at = now()
    WHERE id = p_prediction_id;

    -- Trigger notification
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
        v_user_id,
        'prediction_completed',
        'Prediction Completed',
        'Alzheimer diagnostic scan for patient ' || v_patient_name || ' processed. Result: ' || p_stage || '.'
    );

    -- Log transaction in audit
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, request_id, metadata)
    VALUES (
        v_user_id,
        'finalize_prediction',
        'predictions',
        p_prediction_id,
        v_request_id,
        jsonb_build_object(
            'patient_id', v_patient_id,
            'stage', p_stage,
            'confidence', p_confidence
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 16. Create Indexes
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON public.patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON public.patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_patient_id ON public.predictions(patient_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at_desc ON public.predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON public.predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_stage ON public.predictions(stage);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_health_pings_checked_at_desc ON public.ml_health_pings(checked_at DESC);

-- 17. Grant standard access permission to roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles, public.ml_health_pings TO anon;
