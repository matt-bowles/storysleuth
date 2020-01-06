let round = 0;
let score = 0;
let storyCounter = 0;
let playlist = {};

let tempPlaylist = null;  // Temporarily stores a playlist, without overwriting the current one.

var markers = [];
var locIcon;
var map;

var playerGuessLat;
var playerGuessLng;

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

    map.on('click', function(e) {
        playerGuessLat = e.latlng.lat;
        playerGuessLng = e.latlng.lng;
        placeGuessMarker();
    });

    initaliseNewRound();
});

/**
 * Handles what happens when the user clicks on the map.
 *    - Remove current guess marker (if it exists).
 *    - Add guess marker to where the player clicked.
 *    - Allow the guess to be made (enable guess button).
 */
function placeGuessMarker() {
    if (!markers['locMarker']) {
        
        // Remove guess marker if it has already been placed
        if (markers['guessMarker'] != undefined) {
        map.removeLayer(markers['guessMarker']);
        };

        // Add marker
        markers['guessMarker'] = L.marker([playerGuessLat, playerGuessLng]).addTo(map);

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
    // Display video.
    var story = playlist.stories[storyCounter];
    var storyURL = story.storyURL;

    if (story.isImage) {
        // Hide video player
        $('#video_player').hide();

        // Show image
        $('#image_display').attr("src", storyURL);
        $('#image_display').show();

    } else {
        // Hide image
        $('#image_display').hide();

        $('#video_player').attr("src", storyURL);
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

    var latlngs = Array();  // Contains both the lat/lng positions of the guess and actual location.

    latlngs.push(markers['guessMarker'].getLatLng());
    latlngs.push(markers['locMarker'].getLatLng());

    // Draw line between guess and actual location.
    var polyline = L.polyline(latlngs, {color: 'black', dashArray: "1 5"}).addTo(map);
    
    // Display guess info - how far off was the player?
    var dist = getDistanceFromLatLonInKm(playlist.coords.lat, playlist.coords.lng, playerGuessLat, playerGuessLng);
    $('#guessResult').html(`Your guess was <b> ${dist} km</b> away from the correct location.`);

    // Fly to actual location
    map.flyTo(markers['locMarker'].getLatLng());

    // Update (append) score using the distance between guess and the actual location.
    updateScore(Math.floor(dist));

    // If the player still has more rounds left, show the next round button.
    if (round < playlist.stories.length) {
        $('#nextRoundBtn').show();

        // Load the playlist to be used for the next round, and store it in temp.
        loadNewPlaylist((pl) => {
        tempPlaylist = pl;
        })

    } else {
        // Game is finished, present final score.
        
        // Send score to API
        fetch('/api/score', {
        method: 'post',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({score: score})
        });

        $('#mainContainer').prepend("<h1 id='btnPlayAgain' onclick='resetGame()'>Play again?</h1>");
    }
    }
};

function initaliseNewRound() {
    $('#nextRoundBtn').hide();
    round++;

    // Only fix up the map if it has been tampered with (i.e. if it's not the first round).
    if (round !== 1) {
        clearMap();
    }

    // If a playlist has already been temporarily loaded, then use it as the primary playlist.
    // ... and clear temp.
    if (tempPlaylist !== null) {
        playlist = tempPlaylist;
        tempPlaylist = null;
        showStory();
    } 
    else {
        loadNewPlaylist((pl) => {
            playlist = pl;
            showStory();
        });
    }
}

/**
 * Calls the API to receieve a new playlist. 
 * The user decides what to do with this playlist using a callback parameter when calling the function.
 */ 
function loadNewPlaylist(_callback) {
    // Call API to get next round
    const fetchPromise = fetch('/api/playlist');
    fetchPromise.then(response => {
        return response.json();
    }).then(pl => { _callback(pl) });
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
    playlist = {};

    initaliseNewRound();
    clearMap();
};

/**
 * Removes all markers and lines currently on the map.
 * Also sets the storyCounter to 0.
 */ 
function clearMap() {
    map.removeLayer(markers['guessMarker']);
    map.removeLayer(markers['locMarker']);

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