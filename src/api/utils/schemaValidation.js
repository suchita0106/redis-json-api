import { Validator } from 'jsonschema';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import md5 from 'md5';

// Convert `import.meta.url` to file path (since ES Modules do not support __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the absolute path for schema.json
const schemaPath = path.join(__dirname, 'schema.json');

// Read schema.json using an absolute path
const schemaData = readFileSync(schemaPath, 'utf-8');
const jsonSchema = JSON.parse(schemaData);

const validator = new Validator();

// JSON Schema validation function
const validate = (reqBody) => {
  console.log("📌 Received Request to Validate the json schema Plan");
 // return validator.validate(reqBody, jsonSchema).errors.length === 0;
 if (!jsonSchema) {
  throw new Error("🚨 jsonSchema is undefined. Ensure schema.json is loaded properly.");
}

// Validate JSON structure
const result = validator.validate(reqBody, jsonSchema);

// Debug logs
console.log("🔍 Validation Result:", result);

// If validation has errors, log them
if (result.errors && result.errors.length > 0) {
  console.error("❌ JSON Schema Validation Failed:", result.errors);
  return false; // Return `false` when validation fails
}

console.log("✅ JSON Schema Validation Passed");
return true;

};

// Generate md5 hash
const md5hash = (body) => {
  return md5(body);
};

export { validate, md5hash };