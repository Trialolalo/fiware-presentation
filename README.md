# Guía de Integración Orion-Draco-MongoDB

Esta guía describe cómo configurar un sistema FIWARE que integra Orion Context Broker con Draco para persistir datos históricos en MongoDB.

## Arquitectura

El sistema consta de los siguientes componentes:

- **Orion Context Broker**: Gestiona y distribuye datos de contexto
- **Draco**: Procesa y persiste datos históricos
- **MongoDB**: Base de datos para Orion y para almacenamiento histórico

## Prerrequisitos

- Docker
- Docker Compose
- curl (para pruebas) o POSTMAN
- Un navegador web moderno

## Instalación

### 1. Estructura del Proyecto

```bash
mkdir draco-orion
cd draco-orion
```

### 2. Docker Compose

Crear `docker-compose.yml`:

```yaml
services:
  draco:
    image: ging/fiware-draco:2.1.0
    container_name: fiware-draco
    ports:
      - 8181:8181 # Puerto de interfaz web de Draco
      - 5050:5050 # Puerto de entrada de datos desde Orion
    networks:
      - fiware-network
    environment:
      - NIFI_WEB_HTTP_PORT=8181
      - SINGLE_USER_CREDENTIALS_USERNAME=admin
      - SINGLE_USER_CREDENTIALS_PASSWORD=pass1234567890
      - DRACO_DEBUG_LEVEL=INFO
      - DRACO_MONGO_SERVICE=mongo-draco
      - DRACO_MONGO_PORT=27017

  orion:
    image: fiware/orion:3.10.1 # Orion-v2
    container_name: fiware-orion
    ports:
      - 1026:1026
    networks:
      - fiware-network
    depends_on:
      - mongo-db
    command: -dbhost mongo-db -logLevel DEBUG
    environment:
      - ORION_LOG_LEVEL=DEBUG

  mongo-db:
    image: mongo:4.4
    container_name: db-mongo
    ports:
      - 27017:27017
    networks:
      - fiware-network
    volumes:
      - mongo-data:/data/db
    command: --nojournal

  mongo-draco:
    image: mongo:4.4
    container_name: db-mongo-draco
    ports:
      - 27018:27017
    networks:
      - fiware-network
    volumes:
      - draco-data:/data/db

networks:
  fiware-network:
    driver: bridge

volumes:
  mongo-data:
  draco-data:
```

### 3. Iniciar Servicios

```bash
# Iniciar todos los servicios
docker-compose up -d

# Verificar que todos los contenedores están corriendo
docker ps

# Verificar la red
docker network inspect fiware-network

# Conectar contenedores a la red si es necesario
docker network connect fiware-network fiware-draco
docker network connect fiware-network fiware-orion
docker network connect fiware-network db-mongo
docker network connect fiware-network db-mongo-draco

# Verificar que Orion responde
curl localhost:1026/version
```

## Configuración

### 1. Configurar Draco

1. Acceder a la interfaz web de Draco: http://localhost:8181/nifi

   - Usuario: admin
   - Contraseña: pass1234567890

2. Agregar y configurar procesadores:

   a. **ListenHTTP**:

   - Base Path: `/v2/notify`
   - Listening Port: `5050`
   - Allowed Paths: `/v2/notify`

   b. **NGSIToMongo**:

   - Mongo URI: `mongodb://mongo-draco:27017`
   - Database Prefix: `sth_`
   - Collection Prefix: `sth_`
   - Enable Encoding: `false`
   - Enable Lowercase: `true`
   - Data Model: `db-by-service-path`
   - Attribute Persistence: `row`
   - Default Service: `openiot`
   - Default Service Path: `/`

   c. **LogAttribute** (opcional, para debug)

3. Conectar los procesadores en ese orden
4. Iniciar todos los procesadores

## Pruebas

### 1. Crear Entidad de Prueba

```bash
curl localhost:1026/v2/entities \
-H 'Content-Type: application/json' \
-H 'fiware-service: openiot' \
-H 'fiware-servicepath: /' \
-d '{
    "id": "Restaurant:001",
    "type": "Restaurant",
    "name": {
        "type": "Text",
        "value": "La Buena Mesa"
    },
    "rating": {
        "type": "Float",
        "value": 4.5
    }
}'
```

### 2. Crear Suscripción

```bash
curl localhost:1026/v2/subscriptions \
-H 'Content-Type: application/json' \
-H 'fiware-service: openiot' \
-H 'fiware-servicepath: /' \
-d '{
    "description": "Notify Draco of Restaurant changes",
    "subject": {
        "entities": [{
            "idPattern": ".*",
            "type": "Restaurant"
        }],
        "condition": {
            "attrs": ["rating"]
        }
    },
    "notification": {
        "http": {
            "url": "http://draco:5050/v2/notify"
        },
        "attrs": ["rating"],
        "attrsFormat": "normalized"
    }
}'
```

### 3. Verificar Suscripción

```bash
curl localhost:1026/v2/subscriptions \
-H 'fiware-service: openiot' \
-H 'fiware-servicepath: /' | json_pp
```

### 4. Actualizar Datos

```bash
curl -X PUT localhost:1026/v2/entities/Restaurant:001/attrs/rating \
-H 'Content-Type: application/json' \
-H 'fiware-service: openiot' \
-H 'fiware-servicepath: /' \
-d '{
    "value": 4.8,
    "type": "Float"
}'
```

### 5. Verificar Datos en MongoDB

```bash
# Conectar a MongoDB
docker exec -it db-mongo-draco mongo

# Comandos en MongoDB
use sth_openiot
show collections
db.getCollection('sth_/').find().pretty()
```

## Solución de Problemas

Si el sistema no funciona como se espera:

1. Verificar que todos los contenedores están corriendo:

```bash
docker ps
```

2. Verificar la conectividad de red:

```bash
docker network inspect fiware-network
```

3. Verificar logs de Draco:

```bash
docker logs fiware-draco
```

4. Verificar que la suscripción está activa:

```bash
curl localhost:1026/v2/subscriptions \
-H 'fiware-service: openiot' \
-H 'fiware-servicepath: /'
```

5. Verificar que MongoDB es accesible:

```bash
docker exec -it db-mongo-draco mongo --eval "db.serverStatus()"
```

## Referencias

- [Documentación de Orion](https://fiware-orion.readthedocs.io/)
- [Documentación de Draco](https://fiware-draco.readthedocs.io/)
- [Tutorial FIWARE](https://fiware-tutorials.readthedocs.io/)
