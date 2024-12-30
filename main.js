document.addEventListener('DOMContentLoaded', function () {
  // Llamada a fetchHistoricalData() dentro de DOMContentLoaded
  fetchHistoricalData();
});

async function fetchHistoricalData() {
  try {
    const response = await fetch('http://localhost:3000/historical-data'); // Llamada al servidor Express
    const data = await response.json();

    console.log("Datos históricos:", data); // Verifica los datos en la consola

    // Mapeo de datos para Chart.js
    const labels = data.map(entry => {
      const date = new Date(entry.timestamp);
      if (isNaN(date)) {
        console.error(`Fecha inválida para la entrada: ${entry.timestamp}`);
        return null;
      }
      return date;
    }).filter(date => date !== null);
     // Convertir timestamps a fechas
    const temperatures = data.map(entry => entry.temperature || null); // Obtener temperaturas
    const humidities = data.map(entry => entry.humidity || null); // Obtener humedades

    // Crear el gráfico
    createLineChart(labels, temperatures, humidities);

  } catch (error) {
    console.error('Error al obtener datos históricos:', error);
  }
}

function createLineChart(labels, temperatures, humidities) {
  const ctx = document.getElementById('weatherChart').getContext('2d');
  
  // Asegúrate de que las etiquetas y datos no estén vacíos
  if (labels.length === 0 || temperatures.length === 0 || humidities.length === 0) {
    console.error('No hay datos para mostrar');
    return;
  }

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Temperature',
          data: temperatures,
          borderColor: 'red',
          fill: false,
        },
        {
          label: 'Humidity',
          data: humidities,
          borderColor: 'blue',
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: 'time', // Escala de tiempo para fechas
          time: {
            unit: 'hour', // Cambia según tu necesidad
          },
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}
