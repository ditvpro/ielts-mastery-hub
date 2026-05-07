const fs = require('fs');
const path = require('path');

const topics = [
  "Sci-Fi",
  "Fantasy",
  "Mystery & Thriller",
  "Romance",
  "Slice of Life",
  "Historical",
  "Action & Adventure",
  "Horror",
  "Comedy",
  "Science & Nature"
];

const prefixes = ["The Last", "Hidden", "Dark", "Neon", "Golden", "Silent", "Midnight", "Quantum", "Eternal", "Fallen", "Secret", "Crimson", "Project", "Lost", "Beyond"];
const nouns = ["City", "Guardian", "Shadow", "Heart", "Star", "Mystery", "Quest", "Sword", "Dimension", "Dream", "Echo", "Chronicles", "Legend", "Soul", "Galaxy"];

const comics = [];
let idCounter = 100;

topics.forEach((topic, tIndex) => {
  for(let i = 0; i < 12; i++) {
    const title = `${prefixes[(tIndex + i) % prefixes.length]} ${nouns[(tIndex * i + 3) % nouns.length]}`;
    const level = `Band ${(5.0 + ((i % 6) * 0.5)).toFixed(1)}`; 
    
    comics.push({
      id: String(idCounter),
      title: title,
      topic: topic,
      difficulty: level,
      img: `https://picsum.photos/seed/comic${idCounter}/300/400`,
      passage: `${title} is a fascinating story in the ${topic} genre.\n\nIn a world unlike our own, the protagonist faces unprecedented challenges. The journey begins with a sudden realization that nothing is as it seems. As the events unfold, the true nature of the quest is revealed, testing their limits and beliefs.\n\nThe climax approaches rapidly, bringing together all the elements of the narrative into a cohesive and thrilling conclusion. Readers will find themselves captivated by the rich descriptions and dynamic character development throughout the tale.\n\nThis is a sample text generated to match the comic card you clicked. It helps simulate a real IELTS reading passage.`,
      questions: [
        {
          id: `q${idCounter}_1`,
          type: "multiple-choice",
          text: `What is the main theme of ${title}?`,
          options: ["The journey of discovery", "A mundane daily routine", "A historical documentary", "A culinary guide"],
          correctAnswer: "A",
          explanation: "The text mentions a journey and sudden realization."
        },
        {
          id: `q${idCounter}_2`,
          type: "true-false-not-given",
          text: "The protagonist faces unprecedented challenges.",
          correctAnswer: "True",
          explanation: "The text explicitly states 'the protagonist faces unprecedented challenges'."
        },
        {
          id: `q${idCounter}_3`,
          type: "multiple-choice",
          text: "How is the climax described?",
          options: ["Boring and slow", "Thrilling and cohesive", "Confusing and scattered", "Non-existent"],
          correctAnswer: "B",
          explanation: "The text says 'bringing together all the elements of the narrative into a cohesive and thrilling conclusion'."
        }
      ]
    });
    idCounter++;
  }
});

const outputPath = path.join(__dirname, '..', 'data', 'reading-comics.json');
fs.writeFileSync(outputPath, JSON.stringify(comics, null, 2));
console.log(`Generated ${comics.length} comics and saved to ${outputPath}`);
