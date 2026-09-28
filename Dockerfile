# Use official Node.js 20 image
FROM node:20.11.1

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the app port (adjust if needed)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
