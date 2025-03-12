# Use an official Node.js runtime as a base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and yarn.lock to the working directory
COPY package.json yarn.lock api.js ./

# Install dependencies using yarn
RUN yarn install

# Run the service (assuming you start it with `node api.js`)
CMD ["node", "api.js"]
