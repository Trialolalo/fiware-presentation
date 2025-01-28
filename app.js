// Referencia al desplegable y al iframe
const graphSelector = document.getElementById("graphSelector");
const graphIframe = document.getElementById("graphIframe");

// Cambiar el src del iframe cuando se selecciona una opción diferente
graphSelector.addEventListener("change", (event) => {
  graphIframe.src = event.target.value;
});

if (!user) {
  window.location.href = 'http://localhost:8282/realms/Anysolution/protocol/openid-connect/auth?client_id=Data_visualization&redirect_uri=http://localhost:3200&response_type=code&scope=openid';
}
