async function printFullState() {
  const res = await fetch('https://slopmovie.online/api/cinema/state');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
printFullState();
