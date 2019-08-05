# whereami
A game akin to [GeoGuessr](https://www.geoguessr.com), but instead of using Google Streetview, it uses Snapchat's Snapmap.


## API Usage
The game operates by using custom implementation of the Snapmap API to return a *playlist* of stories based off queries that can be passed to it. By default, the API will return **5 stories for a random city in a random country**.


The playlist API can be called through the address of `/api/playlist`.


### Receive stories for a certain country/countries
Multiple countries are seperated through a comma (,).


E.g. return a playlist of stories for a random city in Australia:

`/api/playlist?include=australia`


E.g. return a playlist of stories for random cities in *both* Australia and Germany:

`/api/playlist?include=australia,germany`


### Receive stories for a random country/city excluding a certain country/countries
As shown previously, multiple countries are seperated through a comma (,).


E.g. return a playlist of stories from a random country and city, *excluding* Mexico:

`/api/playlist?exclude=mexico`


E.g. return a playlist of stories from a random country and city, *excluding both* Mexico and Latvia:

`/api/playlist?exclude=mexico,latvia`


Note that use of the `exclude` query overrides the use of the `include` query, given that most of the time you will want to exclude certain countries instead of including them (from personal experience, anyway).


### Set the number of stories to be returned in a playlist
A Snapchat story for a city can  only hold a maximum of 99 stories, so therefore a boundary of 1 - 99 is enforced.


E.g. return a playlist containing 20 stories:

`/api/playlist?numStories=20`
