package ai.test.classifier_client;

public class Classification {

    private String label;
    private double confidence;
    private double confidenceForLabel;

    public Classification(String label, double confidence, double confidenceForLabel) {
        this.label = label;
        this.confidence = confidence;
        this.confidenceForLabel = confidenceForLabel;
    }

    public String getLabel() {
        return label;
    }

    public double getConfidenceForLabel() {
        return confidenceForLabel;
    }

    public double getConfidence() {
        return confidence;
    }
}
