package ai.test.classifier_client;

public class Classification {
    public String label;
    public double confidence;
    public double confidenceForLabel;

    public Classification(String label, double confidence, double confidenceForLabel) {
        this.label = label;
        this.confidence = confidence;
        this.confidenceForLabel = confidenceForLabel;
    }
}
