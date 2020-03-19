let round = 0;          // The index of the current round
let score = 0;          // The cumulative score of the current game
let storyCounter = 0;   // The index of the story being displayed in the playlist  
let playlist = {};      // Holds the stories for the current playlist/round
let game = [];          // Holds all the rounds for the game

var markers = [];
var locIcon;
var map;

var playerGuessLat;
var playerGuessLng;

var roundGuesses = [];  // Stores the guessed location and score for each round 
var gameId;             // The generated ID for the current game being played

var allMarkers = [];

var gameData;

/**
 * Initialise the game.
 *    - Define map object and set-up map events.
 *    - Show first story in playlist.
 *    - Disable previous button (the player can't play the previous video...).
 *    - Hide the next round button (made visible when player guesses). 
 */
$(document).ready(function () {
    map = L.map('mapid', { worldCopyJump: true, minZoom: 1.5 }).setView([0, 0], 0);

    // Add a tileset to the map - very pretty.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    }).addTo(map);

    // Define custom icon for actual location.
    locIcon = L.icon({
        iconUrl: '/img/location-icon.png',
        iconAnchor:   [10, 15], // point of the icon which will correspond to marker's location,
        iconSize: [30, 30]
    });

    // Enable the fullscreen plugin for Leaflet
    map.addControl(new L.Control.Fullscreen());

    let gameData = $('#gameData').val();

    // Check if existing game is being loaded
    if (gameData) {
        // Extract info from gameData, so that it can be used with existing functions
        gameData = JSON.parse(gameData)[0];
        game = gameData.game.rounds;
        roundGuesses = gameData.roundScores;
        playlist = gameData.game.rounds[0];

        loadGame();
    }
    // New game is being played, let the user make guesses, etc.
    else {
        map.on('click', function(e) {
            playerGuessLat = e.latlng.lat;
            playerGuessLng = e.latlng.lng;
            placeGuessMarker(playerGuessLat, playerGuessLng);
        });
    
        initaliseNewGame();
    }
});

/**
 * Loads an existing game and disables guessing, etc.
 */
function loadGame() {
    // Hide buttons that the user doesn't need
    $('#guessButton').hide();
    $('#nextRoundBtn').hide();

    // Load the first story of the game
    showStory();
    drawGameSummary();

    // Update scorecard values
    roundGuesses.forEach((guess) => {
        round++;
        updateScore(guess.roundScore);
    });
}

/**
 * Handles what happens when the user clicks on the map.
 *    - Remove current guess marker (if it exists).
 *    - Add guess marker to where the player clicked.
 *    - Allow the guess to be made (enable guess button).
 */
function placeGuessMarker(lat, lng) {
    if (!markers['locMarker']) {
        
        // Remove guess marker if it has already been placed
        if (markers['guessMarker'] != undefined) {
        map.removeLayer(markers['guessMarker']);
        };

        // Add marker
        markers['guessMarker'] = L.marker([lat, lng]).addTo(map);

        // Allow user to make guess
        $('#guessButton').attr("disabled", false);
        $('#guessButton').removeClass("btn-danger");
        $('#guessButton').addClass("btn-success");
    }
}

/**
 * Shows the next story in the current playlist, if it exists.
 */ 
function nextStory() {
    if (playlist.stories[storyCounter+1]) {
        storyCounter++;
        showStory();

        $('#prevBtn').removeAttr("disabled");
        if (storyCounter+1 == playlist.stories.length) {
            $('#nextBtn').attr("disabled", "true");
        }
    }
}

/**
 * Shows the previous story in the current playlist, if it exists. 
 */
function prevStory() {
    if (playlist.stories[storyCounter-1]) {
    storyCounter--;
    showStory();

    $('#nextBtn').removeAttr("disabled");
        if (storyCounter == 0) {
            $('#prevBtn').attr("disabled", "true");
        }
    }
}

/**
 * Displays a "video" in the video player, or an image in the image displayer.
 * Also updates the timestamp value.
 */
function showStory() {
    var story = playlist.stories[storyCounter];

    if (story.isImage) {
        // Hide video player
        $('#video_player').hide();

        // Show image
        $('#image_display').attr("src", story.storyURL);
        $('#image_display').show();

    } else {
        // Hide image
        $('#image_display').hide();

        $('#video_player').attr("src", story.storyURL);
        $('#video_player').show();
    }

    // Show timestamp.
    $('#timestamp').text(playlist.stories[storyCounter].timestamp);
}

/**
 * Updates the game's current score, and updates the text which displays it.
 */ 
    function updateScore(dist) {
    $(`#scoreCard tr:nth-child(${round}) td:nth-child(2)`).text(dist);
    score += dist;
    $('#score').text(score);
}

/**
 * Clicking the guess button will do the following things:
 *    - Add map marker to actual location.
 *    - Draw a line on the map between guess and actual location.
 *    - Update the player's score.
 *    - Reposition map to focus on the actual location.
 *    - Display button to load next round _OR_ present the final score.
 */
function makeGuess(){

    if (!markers['locMarker']) {
        // Add location marker to map
        markers['locMarker'] = L.marker([playlist.coords.lat, playlist.coords.lng], {icon: locIcon}).addTo(map);

        lineBetweenTwoMarkers(markers['guessMarker'], markers['locMarker']);
        
        // Display guess info - how far off was the player?
        var dist = getDistanceFromLatLonInKm(playlist.coords.lat, playlist.coords.lng, playerGuessLat, playerGuessLng);
        $('#guessResult').html(`Your guess was <b> ${dist} km</b> away from the correct location.`);

        // Fly to actual location
        map.flyTo(markers['locMarker'].getLatLng());

        // Update (append) score using the distance between guess and the actual location.
        updateScore(Math.floor(dist));
        
        // Save round score and play guess coordinates.
        // (so that they can be submitted to the API when the game finishes)
        roundGuesses.push({roundScore: Math.floor(dist), guessLat: playerGuessLat, guessLng: playerGuessLng});

        // If the player still has more rounds left, show the next round button.
        if (round < playlist.stories.length) {
            $('#nextRoundBtn').show();
        } else {
            // Game is finished, present final score.
            
            // Show all locations on map
            drawGameSummary();

            // Yeah


            // Send score to API
            fetch('/api/score', {
            method: 'post',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({score: score, roundScores: roundGuesses, gameId: gameId})
            });

            $('#mainContainer').prepend("<h1 id='btnPlayAgain' onclick='resetGame()'>Play again?</h1>");
        }
    }
}

/**
 * Draws a dashed black line between 2 markers, and then adds it to the map
 * @param {*} m1 
 * @param {*} m2 
 */
function lineBetweenTwoMarkers(m1, m2) {
    L.polyline([m1.getLatLng(), m2.getLatLng()], {color: 'black', dashArray: "1 5"}).addTo(map);
}

/**
 * Draws a line between each round location and the coordinates of the corresponding user guess.
 * To be called at the end of a game, when all rounds are finished.
 */
function drawGameSummary() {
    for (var i = 0; i < game.length; i++) {
        // Add locations to map
        var actualLocMarker = L.marker([game[i].coords.lat, game[i].coords.lng], { icon: locIcon }).addTo(map);
        var guessLocMarker = L.marker([roundGuesses[i].guessLat, roundGuesses[i].guessLng]).addTo(map);

        allMarkers.push(actualLocMarker);
        allMarkers.push(guessLocMarker);

        // Draw points between each actual/guess coords
        lineBetweenTwoMarkers(actualLocMarker, guessLocMarker);
    }
}

function initaliseNewRound() {
    $('#nextRoundBtn').hide();

    playlist = game[round];
    showStory();

    // Only fix up the map if it has been tampered with (i.e. if it's not the first round).
    if (round !== 0) {
        clearMap();
    }

    round++;
}

/**
 * Calls the API for 'n' new playlists.
 * (where n is 5 by default)
 */
function initaliseNewGame() {
    $('#nextRoundBtn').hide();

    // Load new game
    axios.get('/api/game').then((g) => {
        game = g.data.rounds;
        gameId = g.data._id;
        initaliseNewRound();
    });
}

/**
 * Resets the game.
 *  - Resets scoreboard/total score
 *  - Resets round number
 *  - Loads a new round
 */ 
function resetGame() {
    // Remove btn
    $('#btnPlayAgain').remove();

    // Reset scoreboard
    for (i=1; i<=5; i++) {
        $(`#scoreCard tr:nth-child(${i}) td:nth-child(2)`).text("");
    }
    score = 0;
    $('#score').text(score);
    
    round = 0;
    game = [];
    playlist = {};

    initaliseNewGame();
    clearMap();
};

/**
 * Removes all markers and lines currently on the map.
 * Also sets the storyCounter to 0.
 */ 
function clearMap() {
    map.removeLayer(markers['guessMarker']);
    map.removeLayer(markers['locMarker']);

    allMarkers.forEach((marker) => {
        map.removeLayer(marker);
    })
    

    // Remove the line connecting the two markers
    removeLineFromMap(map);
    
    markers = [];
    $("#guessButton").attr("disabled", true);
    $('#guessResult').text(" ");
    
    map.setView([0, 0], 0);
    
    // User can initially view the next story, but not the previous.
    $('#nextBtn').removeAttr("disabled");
    $('#prevBtn').attr("disabled", "true");

    // Ensures that the first story will be loaded in the round.
    storyCounter = 0;
}