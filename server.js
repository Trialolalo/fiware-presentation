const axios = require('axios');
const express = require('express');
const app = express();
const port = 3000;

async function fetchAndSendWeatherData() {
  try {
    const response = await axios.get('http://www.balearsmeteo.com/son_pou_torrent/test-tags.php');
    const weatherData = response.data;

    if (!weatherData || !weatherData.temp || !weatherData.temp.ago || !weatherData.baro) {
      console.error('Formato de datos inesperado de la API');
      return;
    }

    const temperature = parseFloat(weatherData.temp.ago[0]); 
    const pressure = parseFloat(weatherData.baro.value.value); 
    if (isNaN(temperature) || isNaN(pressure)) {
      console.error('Datos de clima no válidos');
      return;
    }

    const ngsiData = {
      id: 'urn:ngsi-v2:WeatherObserved:001', 
      type: 'WeatherObserved',
      temperature: { type: 'Number', value: temperature },
      pressure: { type: 'Number', value: pressure },
      timestamp: {
        type: 'DateTime',
        value: new Date().toISOString()
      },
    };

    // Enviar datos al Context Broker
    await sendToOrion(ngsiData);
  } catch (error) {
    console.error('Error al obtener o procesar los datos:', error.message);
  }
}

// Función para enviar los datos al Context Broker
async function sendToOrion(data) {
  try {
    const ngsiObject =  {
      temperature: data.temperature,
      pressure: data.pressure,
      timestamp: data.timestamp
    };
    // Intentar actualizar la entidad existente en Orion
    const response = await axios.put(`http://localhost:1026/v2/entities/${data.id}/attrs`, ngsiObject, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 204) {
      console.log(`Datos actualizados en Orion con éxito: ${data.id}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      try {
        const createResponse = await axios.post('http://localhost:1026/v2/entities', data, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (createResponse.status === 201) {
          console.log(`Nueva entidad creada en Orion: ${data.id}`);
        }
      } catch (createError) {
        console.error('Error al crear entidad en Orion:', createError.message);
      }
    } else {
      console.error('Error al actualizar entidad en Orion:', console.log(error));
    }
  }
}

setInterval(fetchAndSendWeatherData, 1 * 60 * 1000);

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});