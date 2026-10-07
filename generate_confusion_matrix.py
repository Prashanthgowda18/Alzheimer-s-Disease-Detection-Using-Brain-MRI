import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

def main():
    # Confusion matrix data
    cm = np.array([
        [410, 207, 23, 0],
        [90, 316, 42, 0],
        [12, 105, 62, 0],
        [2, 8, 0, 2]
    ])

    # Class labels
    classes = [
        "Non-Demented",
        "Very Mild Demented",
        "Mild Demented",
        "Moderate Demented"
    ]

    # Set IEEE paper font preferences
    plt.rcParams["font.family"] = "serif"
    
    # Create figure - using a size that scales well for a two-column IEEE paper
    fig, ax = plt.subplots(figsize=(6, 5.5))

    # Create heatmap
    # cmap='OrRd' gives a clean white-to-orange/red sequential palette
    cbar_kws = {'label': 'Count'}
    heatmap = sns.heatmap(cm, annot=True, fmt='d', cmap='OrRd',
                xticklabels=classes, yticklabels=classes,
                cbar_kws=cbar_kws, ax=ax, 
                annot_kws={"size": 11}, 
                linewidths=0.5, linecolor='lightgray')

    # Customize colorbar label font size
    heatmap.collections[0].colorbar.set_label("Count", size=11)
    heatmap.collections[0].colorbar.ax.tick_params(labelsize=10)

    # Customize labels and title
    ax.set_xlabel('Predicted', fontsize=11, weight='bold')
    ax.set_ylabel('Actual', fontsize=11, weight='bold')
    ax.set_title('Confusion Matrix', fontsize=13, weight='bold', pad=15)

    # Reduce font size of class labels slightly and rotate x labels 35 degrees
    plt.xticks(rotation=35, ha='right', fontsize=9.5)
    plt.yticks(rotation=0, fontsize=9.5)

    # Adjust layout
    plt.tight_layout()

    # Save outputs
    plt.savefig('confusion_matrix.png', dpi=300)
    plt.savefig('confusion_matrix.pdf')
    
    print("Successfully generated confusion_matrix.png and confusion_matrix.pdf")

if __name__ == "__main__":
    main()
