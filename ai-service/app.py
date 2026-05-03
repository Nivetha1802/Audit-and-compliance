from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

# Simple rule-based categorization as a placeholder for "AI"
CATEGORIES = {
    "steel": ["tmt", "steel", "bar", "rod", "iron"],
    "labor": ["wage", "salary", "labor", "worker", "contractor"],
    "cement": ["cement", "concrete", "ultratech", "acc"],
    "electrical": ["wire", "switch", "light", "cable", "electric"],
    "plumbing": ["pipe", "tap", "valve", "plumber", "pvc"]
}

@app.route('/predict-category', methods=['POST'])
def predict_category():
    data = request.json
    description = data.get('description', '').lower()
    
    predicted_category = "Other"
    for category, keywords in CATEGORIES.items():
        if any(keyword in description for keyword in keywords):
            predicted_category = category.capitalize()
            break
            
    return jsonify({
        "description": description,
        "predicted_category": predicted_category,
        "confidence": 0.85 # Placeholder
    })

if __name__ == '__main__':
    app.run(port=5000)
