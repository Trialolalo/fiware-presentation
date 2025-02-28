const axios = require('axios');
const https = require('https');
const express = require('express');
const app = express();
const port = 3004;

// Configuración para ignorar errores de certificados vencidos
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const axiosInstance = axios.create({ httpsAgent }); // Usaremos este para todas las solicitudes

// URL del Context Broker
const ORION_URL = 'https://www.anysolution.org:1027/v2';
const SUBSCRIPTIONS_URL = `${ORION_URL}/subscriptions`;

// Obtener datos meteorológicos y enviarlos al Context Broker
async function fetchAndSendWeatherData() {
  try {
    const response = await axios.get('http://www.balearsmeteo.com/son_pou_torrent/test-tags.php');
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

    const ngsiData = {
      id: 'urn:ngsi-v2:WeatherObserved:son_pou_torrent', 
      type: 'WeatherObserved',
      temperature: { type: 'Number', value: temperature },
      pressure: { type: 'Number', value: pressure },
      humidity: { type: 'Number', value: humidity },
      timestamp: {
        type: 'DateTime',
        value: new Date().toISOString()
      },
    };

    await sendToOrion(ngsiData);
  } catch (error) {
    console.error('Error al obtener o procesar los datos:', error.message);
  }
}



// Enviar datos al Context Broker
async function sendToOrion(data) {
  try {
    const ngsiObject = {
      temperature: data.temperature,
      pressure: data.pressure,
      humidity: data.humidity,
      timestamp: data.timestamp
    };
    const response = await axiosInstance.put(`${ORION_URL}/entities/${data.id}/attrs`, ngsiObject, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 204) {
      console.log(`Datos actualizados en Orion con éxito: ${data.id}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      try {
        const createResponse = await axiosInstance.post(`${ORION_URL}/entities`, data, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (createResponse.status === 201) {
          console.log(`Nueva entidad creada en Orion: ${data.id}`);
        }
      } catch (createError) {
        console.error('Error al crear entidad en Orion:', createError.message);
      }
    } else {
      console.error('Error al actualizar entidad en Orion:', error.message);
    }
  }
}

// Crear una suscripción
// async function createSubscription() {
//   const subscription = {
//     description: "Suscripción a cambios de clima",
//     subject: {
//       entities: [{ idPattern: ".*", type: "WeatherObserved" }],
//       condition: { attrs: ["temperature", "pressure", "humidity"] }
//     },
//     notification: {
//       http: { url: "http://mi-url-notificacion:3004/notify" },
//       attrs: ["temperature", "pressure", "humidity"]
//     },
//     expires: "2026-02-01T00:00:00.00Z",
//     throttling: 5
//   };

//   try {
//     const response = await axiosInstance.post(SUBSCRIPTIONS_URL, subscription, {
//       headers: { 'Content-Type': 'application/json' },
//     });
//     if (response.status === 201) {
//       console.log('Suscripción creada con éxito:', response.data);
//     }
//   } catch (error) {
//     console.error('Error al crear suscripción:', error.message);
//   }
// }

// Endpoint para listar entidades
// async function getAllEntities() {
//   try {
//     const response = await axiosInstance.get(`${ORION_URL}/entities`);
//     console.log('Entidades obtenidas:', JSON.stringify(response.data, null, 2));
//   } catch (error) {
//     console.error('Error al obtener entidades:', error.message);
//   }
// }

// // Llamar a la función para probarla
// getAllEntities();

// Llama periódicamente a fetchAndSendWeatherData
setInterval(fetchAndSendWeatherData, 5 * 60 * 1000);

// Endpoint para probar crear suscripción
app.get('/create-subscription', async (req, res) => {
  await createSubscription();
  res.send('Suscripción creada');
});

// Endpoint para listar entidades
// async function getAllEntities() {
//   try {
//     const response = await axiosInstance.get(`${ORION_URL}/entities`);
//     console.log('Entidades obtenidas:', JSON.stringify(response.data, null, 2));
//   } catch (error) {
//     console.error('Error al obtener entidades:', error.message);
//   }
// }

// // Llamar a la función para probarla
// getAllEntities();


async function getEntityById(entityId) {
  try {
    const response = await axiosInstance.get(`${ORION_URL}/entities/${entityId}`);
    console.log(`Entidad ${entityId}:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error(`Error al obtener la entidad ${entityId}:`, error.response.status, error.response.data);
    } else {
      console.error(`Error de conexión al obtener la entidad ${entityId}:`, error.message);
    }
  }
}

// Llamar a la función con el ID de la entidad que quieres consultar
getEntityById('urn:ngsi-v2:WeatherObserved:son_pou_torrent');



// Endpoint para eliminar una suscripción
app.delete('/delete-subscription/:id', async (req, res) => {
  const subscriptionId = req.params.id;
  await deleteSubscription(subscriptionId);
  res.send(`Suscripción ${subscriptionId} eliminada`);
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
