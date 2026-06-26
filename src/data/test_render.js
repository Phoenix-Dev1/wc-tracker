/* eslint-disable */
const simulationDb = require("./simulation-database.json");
const match = simulationDb["61"];
const size = 56;
const strokeWidth = size * 0.05;
const radius = (size - strokeWidth) / 2 - 3;
const center = size / 2;

console.log("Size:", size, "Radius:", radius, "Center:", center);

const goals = match.goals || [];
const totalMinutes = 90;

goals.forEach((g, idx) => {
  const goalMin = g.minute;
  const minuteAngle = Math.min(goalMin, totalMinutes);
  const theta = (minuteAngle / totalMinutes) * 360 - 90;
  const radians = (theta * Math.PI) / 180;
  const x = radius * Math.cos(radians);
  const y = radius * Math.sin(radians);

  const left = center + x;
  const top = center + y;

  console.log(`Goal #${idx + 1}: ${g.scorer} (${g.minute}'+${g.injuryTime || 0}) -> minuteAngle: ${minuteAngle}, theta: ${theta}, left: ${left.toFixed(2)}, top: ${top.toFixed(2)}`);
});
