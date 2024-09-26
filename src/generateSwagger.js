const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');
const swaggerDefinition = require('./swaggerDefinition');

// Swagger options
const options = {
  swaggerDefinition, // Your swagger definition file
  apis: [path.join(__dirname, './*.js')],
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(options);

// Output path for swagger.json
const outputPath = path.join(__dirname, 'swagger.json');

// Write Swagger specification to swagger.json
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf-8');
console.log(`Swagger JSON file generated at ${outputPath}`);
