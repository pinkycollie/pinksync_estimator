#!/usr/bin/env python3
"""
Data Processor Script for Pipeline System

This script processes input data and produces output for the pipeline system.
It takes two arguments:
1. Input file path (JSON)
2. Output file path (will be JSON)

Usage:
    python3 data_processor.py input.json output.json
"""

import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Any, Union

def load_input(input_path: str) -> Any:
    """Load input data from JSON file"""
    try:
        with open(input_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading input file: {e}", file=sys.stderr)
        sys.exit(1)

def save_output(output_path: str, data: Any) -> None:
    """Save output data to JSON file"""
    try:
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving output file: {e}", file=sys.stderr)
        sys.exit(1)

def extract_entities(text: str) -> List[Dict[str, str]]:
    """Extract entities from text (simplified NER)"""
    entities = []
    
    # Basic entity extraction for demonstration
    # In a real application, use proper NLP libraries like spaCy
    
    # Extract potential company names (uppercase words)
    words = text.split()
    for i, word in enumerate(words):
        if word.isupper() and len(word) > 1:
            entities.append({
                "type": "organization",
                "text": word,
                "position": i
            })
            
    # Extract dates (very simplified)
    date_formats = [
        r"\d{1,2}/\d{1,2}/\d{2,4}",  # MM/DD/YYYY
        r"\d{1,2}-\d{1,2}-\d{2,4}",  # MM-DD-YYYY
    ]
    
    # In real application, use regex for proper date extraction
    for i, word in enumerate(words):
        if "/" in word or "-" in word:
            for part in word.split():
                if any(c.isdigit() for c in part):
                    entities.append({
                        "type": "date",
                        "text": part,
                        "position": i
                    })
    
    return entities

def analyze_sentiment(text: str) -> Dict[str, Any]:
    """Analyze sentiment of text (mock implementation)"""
    # In a real application, use a proper sentiment analysis model
    positive_words = ["good", "great", "excellent", "positive", "amazing", "wonderful", "happy"]
    negative_words = ["bad", "terrible", "negative", "awful", "horrible", "sad", "disappointing"]
    
    words = text.lower().split()
    positive_count = sum(1 for word in words if word in positive_words)
    negative_count = sum(1 for word in words if word in negative_words)
    
    score = 0
    if positive_count + negative_count > 0:
        score = (positive_count - negative_count) / (positive_count + negative_count)
        # Scale from [-1, 1] to [0, 1]
        score = (score + 1) / 2
    
    sentiment = "neutral"
    if score > 0.6:
        sentiment = "positive"
    elif score < 0.4:
        sentiment = "negative"
    
    return {
        "score": score,
        "sentiment": sentiment,
        "positive_count": positive_count,
        "negative_count": negative_count
    }

def process_text_data(data: str) -> Dict[str, Any]:
    """Process text data"""
    # Word count
    words = data.split()
    word_count = len(words)
    
    # Character count
    char_count = len(data)
    
    # Sentences (naive implementation)
    sentences = data.split('.')
    sentence_count = len([s for s in sentences if s.strip()])
    
    # Entity extraction
    entities = extract_entities(data)
    
    # Sentiment analysis
    sentiment = analyze_sentiment(data)
    
    return {
        "analysis": {
            "word_count": word_count,
            "char_count": char_count,
            "sentence_count": sentence_count,
            "average_word_length": char_count / word_count if word_count > 0 else 0,
            "average_sentence_length": word_count / sentence_count if sentence_count > 0 else 0
        },
        "entities": entities,
        "sentiment": sentiment,
        "processed_at": datetime.now().isoformat()
    }

def process_list_data(data: List[Any]) -> Dict[str, Any]:
    """Process list data"""
    item_count = len(data)
    
    numeric_values = []
    text_values = []
    boolean_values = []
    
    for item in data:
        if isinstance(item, (int, float)):
            numeric_values.append(item)
        elif isinstance(item, str):
            text_values.append(item)
        elif isinstance(item, bool):
            boolean_values.append(item)
    
    statistics = {}
    if numeric_values:
        statistics["numeric"] = {
            "count": len(numeric_values),
            "sum": sum(numeric_values),
            "average": sum(numeric_values) / len(numeric_values),
            "min": min(numeric_values),
            "max": max(numeric_values)
        }
    
    if text_values:
        statistics["text"] = {
            "count": len(text_values),
            "average_length": sum(len(t) for t in text_values) / len(text_values),
            "shortest": min(text_values, key=len),
            "longest": max(text_values, key=len)
        }
    
    if boolean_values:
        statistics["boolean"] = {
            "count": len(boolean_values),
            "true_count": sum(1 for b in boolean_values if b),
            "false_count": sum(1 for b in boolean_values if not b)
        }
    
    return {
        "item_count": item_count,
        "statistics": statistics,
        "processed_at": datetime.now().isoformat()
    }

def process_dict_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process dictionary data"""
    # Extract keys and values for analysis
    keys = list(data.keys())
    values = list(data.values())
    
    # Count different value types
    value_types = {}
    for value in values:
        value_type = type(value).__name__
        value_types[value_type] = value_types.get(value_type, 0) + 1
    
    return {
        "meta": {
            "key_count": len(keys),
            "value_types": value_types,
            "processed_at": datetime.now().isoformat()
        },
        "data": data  # Include the original data
    }

def main():
    """Main function"""
    if len(sys.argv) != 3:
        print("Usage: python data_processor.py input.json output.json", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Load input data
    data = load_input(input_path)
    
    # Process data based on its type
    if isinstance(data, str):
        result = process_text_data(data)
    elif isinstance(data, list):
        result = process_list_data(data)
    elif isinstance(data, dict):
        result = process_dict_data(data)
    else:
        result = {
            "error": f"Unsupported data type: {type(data).__name__}",
            "raw_data": str(data)
        }
    
    # Save output data
    save_output(output_path, result)
    print(f"Data processed successfully. Output saved to {output_path}")

if __name__ == "__main__":
    main()