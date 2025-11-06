use serde_json::Value;

pub fn encode_result(result: &Value, encoding_enabled: bool) -> Value {
    if !encoding_enabled {
        return result.clone();
    }

    // Handle result wrapper format
    if let Some(obj) = result.as_object() {
        if let Some(result_value) = obj.get("result") {
            let mut encoded_obj = serde_json::Map::new();
            encoded_obj.insert("result".to_string(), encode_result_value(result_value));
            return Value::Object(encoded_obj);
        }
    }

    encode_result_value(result)
}

fn encode_result_value(value: &Value) -> Value {
    match value {
        Value::Null => Value::Null,
        Value::Bool(b) => Value::Bool(*b),
        Value::Number(n) => Value::Number(n.clone()),
        Value::String(s) => {
            // Encode strings to base64
            use base64::{engine::general_purpose, Engine as _};
            Value::String(general_purpose::STANDARD.encode(s.as_bytes()))
        }
        Value::Array(arr) => {
            // Recursively encode array elements
            Value::Array(arr.iter().map(encode_result_value).collect())
        }
        Value::Object(obj) => {
            let mut encoded = serde_json::Map::new();
            for (k, v) in obj {
                encoded.insert(k.clone(), encode_result_value(v));
            }
            Value::Object(encoded)
        }
    }
}
