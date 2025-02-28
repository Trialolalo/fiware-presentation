const axios = require('axios');
const https = require('https');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// Configuración para ignorar errores de certificados vencidos
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const axiosInstance = axios.create({ httpsAgent });

// Ruta del archivo CSV
const CSV_FILE_PATH = path.join(__dirname, 'datos_meteorologicos_talayot.csv');

// Obtener datos meteorológicos y guardarlos en CSV
async function fetchAndSaveWeatherData() {
  try {
    console.log('Obteniendo datos de la API...');
    const response = await axios.get('http://www.balearsmeteo.com/son_pou_talayot/test-tags.php');
    const weatherData = response.data;

    if (!weatherData || !weatherData.temp || !weatherData.temp.ago || !weatherData.baro || !weatherData.hum) {
      console.error('Formato de datos inesperado de la API');
      return;
    }

    const temperature = parseFloat(weatherData.temp.ago[0]); 
    const pressure = parseFloat(weatherData.baro.value.value);
    const humidity = parseFloat(weatherData.hum.value);


    if (isNaN(temperature) || isNaN(pressure) || isNaN(humidity)) {
      console.error('Datos de clima no válidos');
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`Datos obtenidos - Temp: ${temperature}, Presión: ${pressure}, Humedad: ${humidity}`);

    // Guardar en CSV
    saveToCSV(timestamp, temperature, pressure, humidity);

  } catch (error) {
    console.error('Error al obtener o procesar los datos:', error.message);
  }
}

// Guardar datos en CSV
function saveToCSV(timestamp, temperature, pressure, humidity) {
  const dataLine = `${timestamp},${temperature},${pressure},${humidity}\n`;

  try {
    // Si el archivo no existe, añadir encabezado
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.log('Archivo CSV no existe, creando...');
      fs.writeFileSync(CSV_FILE_PATH, 'timestamp,temperature,pressure,humidity\n', 'utf8');
    }

    // Añadir nueva línea con los datos
    fs.appendFileSync(CSV_FILE_PATH, dataLine, 'utf8');
    console.log('Datos guardados en CSV:', dataLine.trim());

  } catch (error) {
    console.error('Error al escribir en el archivo CSV:', error.message);
  }
}

// Llama periódicamente a fetchAndSaveWeatherData
setInterval(fetchAndSaveWeatherData, 5 * 60 * 1000);


// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
