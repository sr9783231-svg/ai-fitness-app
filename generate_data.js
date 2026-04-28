const fs = require('fs');

console.log("⏳ Initializing Massive Dataset Generator...");

const exercises = ["Squat", "Bench Press", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up", "Dumbbell Curl", "Tricep Extension", "Leg Press", "Calf Raise", "Plank", "Crunch", "Lunge", "Cable Fly", "Lat Pulldown"];
const categories = ["Strength", "Hypertrophy", "Endurance", "Power", "Rehab", "Core"];
const equipment = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Bands"];
const difficulties = ["Beginner", "Intermediate", "Advanced", "Elite"];
const muscles = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body"];

let csvContent = "id,exercise_name,category,equipment,difficulty,target_muscle,calories_per_min,injury_risk_factor\n";

const totalRows = 5000;

for (let i = 1; i <= totalRows; i++) {
    const ex = exercises[Math.floor(Math.random() * exercises.length)];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const eq = equipment[Math.floor(Math.random() * equipment.length)];
    const diff = difficulties[Math.floor(Math.random() * difficulties.length)];
    const mus = muscles[Math.floor(Math.random() * muscles.length)];
    
    const calories = (Math.random() * (12.0 - 3.0) + 3.0).toFixed(2);
    const risk = (Math.random() * (0.9 - 0.1) + 0.1).toFixed(3);
    
    const variationName = `${eq} ${ex} Variation ${i}`;

    csvContent += `${i},${variationName},${cat},${eq},${diff},${mus},${calories},${risk}\n`;
}

fs.writeFileSync('massive_fitness_dataset.csv', csvContent);

console.log(`✅ SUCCESS! Generated massive_fitness_dataset.csv with ${totalRows} rows.`);
console.log(`Look in your VS Code file explorer, the file is ready!`);