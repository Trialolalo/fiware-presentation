const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
const PORT = 4000;

const mongoUrl = "mongodb://localhost:27018";
const dbName = "sth_weatherdb";
const collectionName = "sth_/_urn:ngsi-v2:weatherobserved:001_weatherobserved";

app.use(cors({ origin: "*" }));

app.get("/data", async (req, res) => {
  const client = new MongoClient(mongoUrl);

  try {
    console.log("Conectando a MongoDB...");
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    console.log("Obteniendo datos de la colección...");
    const data = await collection.find({}).toArray();

    console.log("Datos originales de MongoDB:", data);

    // Normaliza los datos: convierte recvTime a ISO8601 completo y redondea a minutos
    const normalizedData = data.map((entry) => {
      let timestamp;
      try {
        if (entry.recvTime instanceof Date) {
          timestamp = new Date(
            Math.floor(entry.recvTime.getTime() / 60000) * 60000
          ).toISOString(); // Redondea a minutos
        } else if (entry.recvTime?.$date) {
          timestamp = new Date(
            Math.floor(new Date(entry.recvTime.$date).getTime() / 60000) *
              60000
          ).toISOString(); // Redondea a minutos
        } else if (typeof entry.recvTime === "string") {
          timestamp = new Date(
            Math.floor(new Date(entry.recvTime).getTime() / 60000) * 60000
          ).toISOString(); // Redondea a minutos
        } else {
          console.warn("recvTime no tiene un formato válido:", entry.recvTime);
          return null; // Ignora entradas con recvTime no válido
        }

        return {
          timestamp, // Timestamp redondeado y completo
          attrName: entry.attrName,
          attrValue: parseFloat(entry.attrValue),
        };
      } catch (error) {
        console.error("Error procesando recvTime:", entry.recvTime, error);
        return null;
      }
    }).filter(Boolean); // Filtra los valores nulos

    console.log("Datos normalizados:", normalizedData);

    // Agrupa los datos por timestamp, asegurándonos de eliminar "timestamp" no deseado
    const groupedData = normalizedData.reduce((acc, entry) => {
      if (entry.attrName === "timestamp") return acc; // Ignoramos las entradas con "timestamp" como atributo

      let existing = acc.find((item) => item.timestamp === entry.timestamp);
      if (existing) {
        existing[entry.attrName] = entry.attrValue;
      } else {
        acc.push({
          timestamp: entry.timestamp,
          [entry.attrName]: entry.attrValue,
        });
      }
      return acc;
    }, []);

    console.log("Datos agrupados para la API:", groupedData);

    res.json(groupedData);
  } catch (error) {
    console.error("Error al conectar a MongoDB o procesar datos:", error);
    res.status(500).send("Error al obtener los datos");
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => {
  console.log(`Servidor API ejecutándose en http://localhost:${PORT}/data`);
});
