export const environment = {
  production: true, // Change to true to activate production environment
  apiUrlDev: 'http://localhost:3000/api',
  // apiUrlDev: 'http://localhost:8073/api',
  apiUrlProd:'https://smart-invites-production.up.railway.app/api',
  // apiUrlProd:'https://api.smart-invite.com/api'
};
if (environment.production) {
  console.log("✅ Environment de Prduction chargé !");
}else{
  console.log("✅ Environment de Développement chargé !");
}
