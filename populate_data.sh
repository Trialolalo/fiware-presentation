#!/bin/bash

# Base URL for Orion
ORION_URL="http://localhost:1026"

# Headers
CONTENT_TYPE="Content-Type: application/ld+json"

echo "🔵 Step 0: Cleaning up existing entities..."
# Delete existing sensors
curl -iX DELETE "${ORION_URL}/ngsi-ld/v1/entities/urn:ngsi-ld:Sensor:001" \
  -H "${CONTENT_TYPE}"
curl -iX DELETE "${ORION_URL}/ngsi-ld/v1/entities/urn:ngsi-ld:Sensor:002" \
  -H "${CONTENT_TYPE}"

# Delete existing subscriptions (optional)
curl -iX GET "${ORION_URL}/ngsi-ld/v1/subscriptions/" \
  -H "${CONTENT_TYPE}" | jq -r '.[].id' | while read id; do
  curl -iX DELETE "${ORION_URL}/ngsi-ld/v1/subscriptions/${id}" \
    -H "${CONTENT_TYPE}"
done

sleep 2
echo "🔵 Step 1: Creating subscription to Draco for data persistence..."
curl -iX POST "${ORION_URL}/ngsi-ld/v1/subscriptions/" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "description": "Notify Draco of all sensor changes",
    "type": "Subscription",
    "entities": [{"type": "Sensor"}],
    "notification": {
        "endpoint": {
            "uri": "http://draco:5050/v2/notify",
            "accept": "application/json"
        }
    },
    "@context": ["https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"]
}'

echo -e "\n🔵 Step 2: Creating initial sensor entities..."
# Create first sensor
curl -iX POST "${ORION_URL}/ngsi-ld/v1/entities/" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "id": "urn:ngsi-ld:Sensor:001",
    "type": "Sensor",
    "temperature": {
        "type": "Property",
        "value": 23.4
    },
    "humidity": {
        "type": "Property",
        "value": 70
    },
    "location": {
        "type": "GeoProperty",
        "value": {
            "type": "Point",
            "coordinates": [-3.7167, 40.3833]
        }
    },
    "@context": ["https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"]
}'

# Create second sensor
curl -iX POST "${ORION_URL}/ngsi-ld/v1/entities/" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "id": "urn:ngsi-ld:Sensor:002",
    "type": "Sensor",
    "temperature": {
        "type": "Property",
        "value": 25.1
    },
    "humidity": {
        "type": "Property",
        "value": 65
    },
    "location": {
        "type": "GeoProperty",
        "value": {
            "type": "Point",
            "coordinates": [-3.7186, 40.3834]
        }
    },
    "@context": ["https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"]
}'

sleep 2
echo -e "\n🔵 Step 3: Querying all sensors (initial state)..."
curl -X GET "${ORION_URL}/ngsi-ld/v1/entities?type=Sensor" \
  -H "${CONTENT_TYPE}" | json_pp

sleep 2
echo -e "\n🔵 Step 4: Updating sensor 001 (this will trigger notification to Draco)..."
curl -iX PATCH "${ORION_URL}/ngsi-ld/v1/entities/urn:ngsi-ld:Sensor:001/attrs/temperature" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "value": 26.7,
    "type": "Property",
    "@context": ["https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld"]
}'

sleep 2
echo -e "\n🔵 Step 5: Querying specific sensor after update..."
curl -X GET "${ORION_URL}/ngsi-ld/v1/entities/urn:ngsi-ld:Sensor:001" \
  -H "${CONTENT_TYPE}" | json_pp

echo -e "\n✅ Script completed! Now you can:"
echo "1. Check Orion data at: http://localhost:1026/ngsi-ld/v1/entities"
echo "2. Access Draco UI at: http://localhost:8181/nifi (admin:pass1234567890)"
echo "3. Verify data persistence in MongoDB at port 27018"