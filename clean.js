const fs = require('fs');
const path = require('path');

const CSV_FILE_PATH = path.join(__dirname, 'datos_meteorologicos_talayot.csv');

// Función para limpiar el CSV
function cleanCSV() {
  try {
    let data = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    let lines = data.split('\n');

    // Verifica si hay datos suficientes
    if (lines.length < 2) {
      console.log('El archivo CSV no tiene suficientes datos para limpiar.');
      return;
    }

    let cleanedLines = lines.map((line, index) => {
      if (index === 0) return line; // Mantiene el encabezado intacto
      let parts = line.split(',');

      if (parts.length === 4) {
        parts[3] = parts[3].trim(); // Elimina espacios de la humedad
      }

      return parts.join(',');
    });

    // Reescribir el archivo CSV
    fs.writeFileSync(CSV_FILE_PATH, cleanedLines.join('\n'), 'utf8');
    console.log('Archivo CSV limpiado correctamente.');

  } catch (error) {
    console.error('Error al limpiar el archivo CSV:', error.message);
  }
}

// Ejecutar limpieza
cleanCSV();
