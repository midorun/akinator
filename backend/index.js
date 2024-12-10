const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;



// For more control, configure specific origins



app.use(bodyParser.json());

// File path for saving the game tree
const dbFilePath = path.join(__dirname, "gameTree.json");

// Node class
class Node {
    constructor(value) {
        this.value = value; // Question or Answer
        this.yes = null; // Yes branch
        this.no = null; // No branch
    }

    isLeaf() {
        return !this.yes && !this.no;
    }
}

// Load or initialize the tree
let root;
if (fs.existsSync(dbFilePath)) {
    const treeData = JSON.parse(fs.readFileSync(dbFilePath, "utf-8"));
    root = deserializeTree(treeData);
    console.log("Loaded game tree from file.");
} else {
    root = new Node("Is it an animal?");
    root.yes = new Node("Does it bark?");
    root.no = new Node("Is it a vehicle?");
    root.yes.yes = new Node("Dog");
    root.yes.no = new Node("Cat");
    root.no.yes = new Node("Car");
    root.no.no = new Node("Plane");
    saveTreeToFile();
    console.log("Initialized new game tree.");
}

let currentNode = root;

// Serialize the tree to save it
function serializeTree(node) {
    if (!node) return null;
    return {
        value: node.value,
        yes: serializeTree(node.yes),
        no: serializeTree(node.no),
    };
}

// Deserialize the tree to load it
function deserializeTree(data) {
    if (!data) return null;
    const node = new Node(data.value);
    node.yes = deserializeTree(data.yes);
    node.no = deserializeTree(data.no);
    return node;
}

// Save the tree to the file
function saveTreeToFile() {
    fs.writeFileSync(dbFilePath, JSON.stringify(serializeTree(root), null, 2), "utf-8");
}

app.use(cors());

// Routes
// 1. Get the current question or guess
app.get("/question", (req, res) => {
    res.json({
        question: currentNode.value,
        isLeaf: currentNode.isLeaf(),
    });
});

// 2. Send the user's response
app.post("/answer", (req, res) => {
    const { answer } = req.body; // true for Yes, false for No

    if (currentNode.isLeaf()) {
        if (answer) {
            res.json({ result: "I guessed it!" });
            currentNode = root; // Restart the game
        } else {
            res.json({ result: "I need to learn." });
        }
    } else {
        currentNode = answer ? currentNode.yes : currentNode.no;
        res.json({ success: true });
    }
});

// 3. Learn a new answer
app.post("/learn", (req, res) => {
    const { correctAnswer, distinguishingQuestion, yesForCorrectAnswer } = req.body;

    const newQuestion = new Node(distinguishingQuestion);
    newQuestion.yes = yesForCorrectAnswer ? new Node(correctAnswer) : new Node(currentNode.value);
    newQuestion.no = yesForCorrectAnswer ? new Node(currentNode.value) : new Node(correctAnswer);

    currentNode.value = newQuestion.value;
    currentNode.yes = newQuestion.yes;
    currentNode.no = newQuestion.no;

    saveTreeToFile(); // Save the updated tree
    currentNode = root; // Reset for the next game
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Akinator backend running on http://localhost:${port}`);
});
