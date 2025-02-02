// Server-side (index.js)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://rpsclash.netlify.app/"],
    methods: ["GET", "POST"]
  }
});

let players = [];
let scores = { player1: 0, player2: 0 };

io.on('connection', (socket) => {
  console.log('A player connected');

  socket.on('set_name', (name) => {
    if (players.length === 0) {
        socket.emit('waiting_for_opponent', 'Waiting for another player to join...');
    }

    players.push({ socket, name, choice: null });

    if (players.length === 1) {
        scores = { player1: 0, player2: 0 };
    }

    if (players.length === 2) {
        io.emit('game_start', `${players[0].name} vs ${players[1].name}`);
        io.emit('player_names', { 
            player1: players[0].name, 
            player2: players[1].name, 
            scores 
        });
    }
});


socket.on('make_choice', (choice) => {
  const playerIndex = players.findIndex(p => p.socket === socket);
  if (playerIndex !== -1) {
    players[playerIndex].choice = choice;

    // Emit the opponent's choice only when both players have chosen
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    if (players[opponentIndex].choice) {
      io.emit('opponent_choice', players[opponentIndex].choice);
    }

    if (players[0].choice && players[1].choice) {
      determineWinner();
    }
  }
});



  

  socket.on('restart_game', () => {
    players.forEach(player => player.choice = null);
    scores = { player1: 0, player2: 0 };
    io.emit('restart', {
      message: 'New game started! Make your choices.',
      scores
    });
  });

  socket.on('disconnect', () => {
    console.log('A player disconnected');
    players = players.filter(p => p.socket !== socket);
    if (players.length < 2) {
      io.emit('waiting_for_opponent', 'Your opponent has left. Waiting for a new player...');
    }
  });
});

function determineWinner() {
  const player1 = players[0];
  const player2 = players[1];

  let result = 'It\'s a draw!';
  if ((player1.choice === 'rock' && player2.choice === 'scissors') ||
      (player1.choice === 'paper' && player2.choice === 'rock') ||
      (player1.choice === 'scissors' && player2.choice === 'paper')) {
    result = `${player1.name} wins! 🥳`;
    scores.player1++;
  } else if ((player2.choice === 'rock' && player1.choice === 'scissors') ||
             (player2.choice === 'paper' && player1.choice === 'rock') ||
             (player2.choice === 'scissors' && player1.choice === 'paper')) {
    result = `${player2.name} wins! 🥳`;
    scores.player2++;
  }

  io.emit('game_over', { result, scores });

  if (scores.player1 >= 10 || scores.player2 >= 10) {
    const winner = scores.player1 >= 10 ? players[0].name : players[1].name;
    io.emit('game_winner', { winner });
  }

  players.forEach(player => player.choice = null);
}

server.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
});