// Swagger
const swaggerAutogen = require('swagger-autogen')({
  // openapi:          <string>,     // Enable/Disable OpenAPI.                        By default is null
  // language:         <string>,     // Change response language.                      By default is 'en-US'
  // disableLogs:      <boolean>,    // Enable/Disable logs.                           By default is false
  autoHeaders:      true,    // Enable/Disable automatic headers recognition.  By default is true
  autoQuery:        true,    // Enable/Disable automatic query recognition.    By default is true
  // writeOutputFile:  <boolean>     // Enable/Disable writing the output file.        By default is true
});

const doc = {
  info: {
    version: 'v1.0.0', 
    title: 'N2N-backend',
    description: ''
  },
  host: 'localhost:3000/api/v1/n2n',
  tags: [                   // by default: empty Array
    {
      name: 'Index',             // Tag name
      description: ''       // Tag description
    },
    {
      name: 'Users',             // Tag name
      description: ''       // Tag description
    },
    // { ... }
  ],
};

const outputFile = './swagger-output.json';
const routes = ['./routes/*.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, routes, doc);