import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Futbol App API',
    version: '1.0.0',
    description: 'Documentación de la API para la aplicación de fútbol',
  },
  servers: [
    {
      url: 'http://localhost:5000',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/matches.js',
     './src/routes/team.js',
      './src/routes/goal.js',
      './src/routes/player.js'
    ] // Aquí están tus endpoints
};

export const swaggerSpec = swaggerJSDoc(options);