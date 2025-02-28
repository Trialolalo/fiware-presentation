# Usa una imagen oficial de Node.js
FROM node:18

# Crea un directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos al contenedor
COPY package.json package-lock.json* ./
RUN npm install

# Copia el código fuente al contenedor
COPY . .

# Ejecuta el script como un daemon
CMD ["node", "script.js"]

