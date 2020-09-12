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
    
    initTouchGestures();

    map = L.map('map', { worldCopyJump: true, minZoom: 1.5 }).setView([0, 0], 0);

    // Add a tileset to the map - very pretty.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
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
        game = gameData.game;
        roundGuesses = gameData.roundScores;
        playlist = gameData.game.rounds[0];

        loadGame();
    }
    // New game is being played, let the user make guesses, etc.
    else {
        map.on('click', function(e) {
            // Prevent player from making guess if round hasn't been loaded yet
            if (!playlist.coords) return;

            playerGuessLat = e.latlng.lat;
            playerGuessLng = e.latlng.lng;
            placeGuessMarker(playerGuessLat, playerGuessLng);
        });
    
        initaliseNewGame();
    }




    // Change "round" text to "r" when mobil
    if (window.innerWidth <= 667) {
        $('.roundText').text("R.");
    } else {
        $('.roundText').text("Round");
    }
});

/**
 * Sets up mobile touch gestures for changing stories
 */
function initTouchGestures() {
    // Stop, hammertime
    var media_content = document.querySelector("#media_content");
    var hammertime = new Hammer(media_content);

    // Get prev. story when swiping right
    hammertime.on("swiperight", (e) => {
        e.preventDefault();
        prevStory();
    });

    // Get next story when swiping left
    hammertime.on("swipeleft", (e) => {
        e.preventDefault();
        nextStory();
    });
}

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
    postGame();

    // Update scorecard values
    roundGuesses.forEach((guess) => {
        round++;
        updateScore(guess.roundScore);
    });
}

/**
 * Allows users to revisit the playlist of each round
 */
function postGame() {
    // The "round" labels (1 through 5)
    cols = $("#scoreCard > tbody:nth-child(1) > tr:nth-child(1) td");
    cols = Object.values(cols);
    cols = cols.slice(0, cols.length-3);

    // Add hover styling to each label
    cols.forEach((col) => {
        col.addEventListener('mouseover', () => col.classList.add("scorecardHover"));
        col.addEventListener('mouseout', () => col.classList.remove("scorecardHover"));
    });


    // Show location for round on map, as well as relevant stories
    cols.forEach((col) => {
        col.addEventListener('click', () => {
            let i = cols.findIndex(c => c == col);
            playlist = game.rounds[i];
            showStory();
            map.setView([game.rounds[i].coords.lat, game.rounds[i].coords.lng], 15);
        })
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
    $(`#scoreCard tr:nth-child(2) td:nth-child(${round})`).text(dist);
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

        // Show location name when hovering over the marker
        createTooltip(markers['locMarker'], playlist.location);
 
        lineBetweenTwoMarkers(markers['guessMarker'], markers['locMarker']);

        // Display guess info - how far off was the player?
        var dist = getDistanceFromLatLonInKm(playlist.coords.lat, playlist.coords.lng, playerGuessLat, playerGuessLng);
        let roundScore = calcScore(dist);

        $('#guessResult').show();
        $('#guessResult').html(`Your guess was⠀<b>${dist} km</b>⠀away from the correct location. You earned⠀<b>${roundScore}</b>⠀points this round.`);

        // Fly to actual location
        map.flyTo(markers['locMarker'].getLatLng());

        

        // Update (append) score using the distance between guess and the actual location.
        updateScore(roundScore);
        
        // Save round score and play guess coordinates.
        // (so that they can be submitted to the API when the game finishes)
        roundGuesses.push({roundScore, guessLat: playerGuessLat, guessLng: playerGuessLng});

        $('#guessButton').hide();

        // If the player still has more rounds left, show the next round button.
        if (round < playlist.stories.length) {
            $('#nextRoundBtn').show();
        } else {
            // Game is finished, present final score.
            
            // Show all locations on map
            drawGameSummary();

            postGame();

            // Send score to API
            fetch('/api/score', {
            method: 'post',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({score: score, roundScores: roundGuesses, gameId: gameId})
            });

            $('#btnPlayAgain').removeAttr("hidden");
        }
    }
}

/**
 * Creates a tooltip for a marker that when hovered over, reveals the location's name. 
 * @param {*} marker any Leaflet marker
 * @param {*} location an object containing keys for "city" and "country"
 */
function createTooltip(marker, location) {
    marker.bindTooltip(`${location.city}, ${location.country}`, { direction: 'top', offset: [5, -12] });
    marker.on('mouseover', function (e) { this.openTooltip(); });
    marker.on('mouseout', function (e) { this.closeTooltip(); });
}

/**
 * Draws a dashed black line between 2 markers, and then adds it to the map
 * @param {*} m1 
 * @param {*} m2 
 */
function lineBetweenTwoMarkers(m1, m2) {
    L.motion.polyline(
        [m1.getLatLng(), m2.getLatLng()],
        {
            color: 'black',
            dashArray: "1 5"},
        {
            auto: true,
            duration: 500,
            easing: L.Motion.Ease.easeInOutQuart
        },
        {
            removeOnEnd: true,
            showMarker: false,
        }

    ).addTo(map);
}

/**
 * Draws a line between each round location and the coordinates of the corresponding user guess.
 * To be called at the end of a game, when all rounds are finished.
 */
function drawGameSummary() {
    for (var i = 0; i < game.rounds.length; i++) {

        // Add locations to map
        var actualLocMarker = L.marker([game.rounds[i].coords.lat, game.rounds[i].coords.lng], { icon: locIcon }).addTo(map);
        var guessLocMarker = L.marker([roundGuesses[i].guessLat, roundGuesses[i].guessLng]).addTo(map);

        if (game.rounds[i].location) {
            createTooltip(actualLocMarker, game.rounds[i].location);
        }

        allMarkers.push(actualLocMarker);
        allMarkers.push(guessLocMarker);

        // Draw points between each actual/guess coords
        lineBetweenTwoMarkers(actualLocMarker, guessLocMarker);
    }
}

function initaliseNewRound() {
    $('#nextRoundBtn').hide();
    $('#guessResult').hide();
    $('#guessButton').show();
    $('#prevBtn').attr('disabled', true);

    storyCounter = 0;
    playlist = game.rounds[round];
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
    $('#prevBtn').attr('disabled', false);

    // Remove post-game functionality, just incase...
    $(`#scoreCard tr`).unbind();

    // Load new game
    axios.get('/api/game').then((g) => {

        game = g.data;
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
    $('#btnPlayAgain').attr("hidden", true);

    $('#guessResult').hide();

    // Reset scoreboard
    for (i=1; i<=5; i++) {
        $(`#scoreCard tr:nth-child(2) td:nth-child(${i})`).text("");
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

/**
 * Calculates a score for a round - ranges between 5000 and 0
 * @param {*} dist distance between guess and actual location in km
 */
function calcScore(dist) {
    return Math.floor((10/dist)*5000);
}