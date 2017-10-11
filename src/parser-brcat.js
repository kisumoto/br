function loadEntryWindowData( entryWindow )
{
  var systemName = entryWindow.system.toUpperCase( );
  var systemData = _.find( gSolarSystems, function ( solarsystem ) { return solarsystem.N.toUpperCase( ) == systemName; } );
  readZkbData( 1 , createZkbDateStart( entryWindow.startTime ), createZkbDateEnd( entryWindow.endTime ), systemData, 0 );
}

// /////////////////////////////////////// ZKillboard parsing ///////////////////////////////////////////

function testCallBack()
{
  console.log('callback');
}

var createCORSRequest = function(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // Most browsers.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // IE8 & IE9
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    xhr = null;
  }
  return xhr;
};

function readZkbData( pageNumber, startTime, endTime, systemData , offset )
{
  var pageNumModTen = (( pageNumber - 1 ) % 10 ) + 1;
  var zKillURL = 'https://zkillboard.com/api/kills/solarSystemID/' + systemData.I + '/startTime/' + startTime + '/endTime/' + endTime +'/page/' + pageNumModTen + '/';
  if( offset != 0 )
  {
    zKillURL += 'beforeKillID/' + offset + '/';
  }
  console.log( zKillURL );

  // gTasks: now incrementing a global variable named gTasks whenever we issue any ajax request. AFTER
  //         our success or error handler method is called and complete, we then decrement the gTasks
  //         global to keep track of how many outstanding requests are pending so that we know when we
  //         are done receiving data and should start processing the data
  ++gTasks;
  waitCursor( true );
  
  // new CORS code
  var method = 'GET';
  var xhr = createCORSRequest(method, zKillURL);
  var corsResponse;

  xhr.onload = function() {
    // Success code goes here.
    console.log('loaded');
    //console.log(this.response);
    corsResponse = JSON.parse(this.response);
    parseZkbData( corsResponse, pageNumber, startTime, endTime, systemData );
  };

  xhr.onerror = function() {
    // Error code goes here.
    console.log('error');
  };

  console.log("doing zkill query");
  console.log(zKillURL);

  xhr.send();
  
  // OLD AJAX CODE
  /*
  $.ajax( {
    url: zKillURL,
    type: 'GET',
    contentType: 'text/plain',
    //dataType: 'json',    // tell jQuery we're expecting JSONP
    xhrFields: {
      // The 'xhrFields' property sets additional fields on the XMLHttpRequest.
      // This can be used to set the 'withCredentials' property.
      // Set the value to 'true' if you'd like to pass cookies to the server.
      // If this is enabled, your server must respond with the header
      // 'Access-Control-Allow-Credentials: true'.
      withCredentials: false
    },
    headers: {
              // headers
             },
    //jsonpCallback: 'testCallBack',
    //jsonp: false,
    //data: { format: 'jsonp' },
    cache: true,
    success: function( response ) { parseZkbData( response, pageNumber, startTime, endTime, systemData ); },
    error: function( jqXHR, textStatus, errorThrown )
    {
      $( '#status' ).text( 'Error while reading data for ' + systemData.N + ' from ' + startTime + ' to ' + endTime + ', page #' + pageNumber );
      console.log( 'error in readZkbData: ' + textStatus +':'+ errorThrown );
      --gTasks;
      waitCursor( false );
    }
  });
  */
  var NowTime = new Date();
}

function parseZkbData( response, pageNumber, startTime, endTime, systemData )
{
  //console.log(response);
  // must set status BEFORE posting any additional ajax requests
  $('#status').text( 'Reading data for ' + systemData.N + ' from ' + startTime + ' to ' + endTime + ', page #' + pageNumber );

  // TODO: need to add code to generate new query if we more than 10 pages of results
  
  // if we get a full set of results, go ahead and post the ajax request for the next set of data
  if( response.length == 200 )
  {
    // since zKillBoard will only send us at most 10 pages of data, if we have a full set of results
    // on our tenth page we need to adjust the time window and resubmit the query.  the code inside of
    // readZkbData is responsible for doing a modulo 10 on the page number to keep it valid for zKillBoard,
    // thus we can keep the page number incrementing and display a total number of pages read
    if ( pageNumber % 10 == 0 )
    {
      // set time of last kill we got to page through the available data
      var lastKillTime = response[ response.length - 1 ].killTime.replace(/:/g,'').replace(/-/g,'').replace(/ /g,'').substring(0,12);
      generateSummary( startTime, endTime, lastKillTime, true );
      readZkbData( pageNumber + 1 , startTime, lastKillTime, systemData, 0 );
    }
    else
    {
      generateSummary( startTime, endTime, lastKillTime, true );
      readZkbData( pageNumber + 1 , startTime, endTime, systemData, 0 );
    }
  }

  // if length != 0, we got some results back, go ahead and push those results into our global set
  _.each( response, function( element )
  {
    if ( gData[ '' + element.killID ] == undefined )
    {
      ++gDataCount;
      gData[ '' + element.killID ] = element;
      parseKillRecord( element );
    }
  } );

  // if our number of tasks is 0 ( really shouldn't ever be negative ), then all the ajax requests
  // we have posted have finished, therefore we should go ahead and process the data we have collected
  // and present the user the team selection UI
  if ( --gTasks <= 0 )
  {
    $('#status').text( 'Compiling pilot statistics...' );
    // generate our final summary line
    generateSummary( startTime, endTime, startTime, false );
    gData = _.sortBy( gData, function( killRecord ) { return killRecord.killTime; } );

    var elapsed = ( new Date( )).getTime( ) - gProcessingTime.getTime( );
    console.log( 'processing time: ' + elapsed + ' ms' );

    build_data( );
    $('#status').text( 'Ready for team selection.' );
    if ( gSpinner != undefined )
    {
      gSpinner.stop( );
      gSpinner = undefined;
    }
    refresh( );
  }
  if(gOptGotoReplay){
    $( "#tabs" ).tabs( "option", "active", 4 );
  }
  waitCursor( false );
}

// /////////////////////////////////////// eve-kill parsing ///////////////////////////////////////////

function readEveKillUrl( index, url, callback )
{
  // gTasks: now incrementing a global variable named gTasks whenever we issue any ajax request. AFTER
  //         our success or error handler method is called and complete, we then decrement the gTasks
  //         global to keep track of how many outstanding requests are pending so that we know when we
  //         are done receiving data and should start processing the data
  ++gTasks;
  waitCursor( true );
  $.ajax( {
    url: url,
    type: 'GET',
    success: function( result )                       { callback( result, index ); --gTasks; waitCursor( false ); },
    error: function( jqXHR, textStatus, errorThrown ) { --gTasks; waitCursor( false ); }
  } );
}

function parseEveKillIndividualMail( result, index )
{
  var $baseHtml = $( result.responseText );
  if ( $baseHtml == undefined || $baseHtml.length == 0 )
  {
    $('#status').text( 'Reading individual killmail failed' );
    return;
  }

  var $box = $baseHtml.find( '#kl-detail-vicship' );
  var system = $box.find( '.kb-table-row-even:eq(0)' ).find( 'td:eq(1)' ).find( 'strong' ).text( );

  var killTime = Date.parse( $box.find( '.kb-table-row-odd:eq(1)' ).find( 'td:eq(1)' ).find( 'p' ).text( ));
  // base time from eve-kill individual mail is -2 hours to +1 hour from the timestamp in the mail
  var baseTime  = new Date( killTime );
  var startTime = new Date( baseTime.getTime( ) - ( baseTime.getTimezoneOffset( ) + 120 ) * MS_PER_MINUTE );
  var endTime   = new Date( baseTime.getTime( ) - ( baseTime.getTimezoneOffset( ) - 60 ) * MS_PER_MINUTE );

  gEntryWindowData[ index ].startTime = startTime;
  gEntryWindowData[ index ].endTime   = endTime;
  gEntryWindowData[ index ].system    = system;
  uiSetDateTime( startTime, '#start', index );
  uiSetDateTime( endTime,   '#end', index );
  loadEntryWindowData( gEntryWindowData[ index ] );
  updateEntryUIFromData( );
}

function parseEveKillRelatedKills( result, index )
{
  var $baseHtml = $( result.responseText );
  var entryWindow = gEntryWindowData[ index ];

  if ( $baseHtml == undefined || $baseHtml.length == 0 )
  {
    var url = entryWindow.system.replace( 'related', 'detail' );
    url = url.replace( '&adjacent', '' );
    $( '#status' ).text( 'Reading killmail from ' + url );
    readEveKillUrl( index, url, parseEveKillIndividualMail );
    return;
  }
  else
  {
    $('#status').text( 'Reading ' + entryWindow.system + ' successful.' );
  }
  // Get Battle Summary info
  var summary = $baseHtml.find('.kb-kills-header').first().text().replace(/^\s+|\s+$/g, '');
  var comma = summary.lastIndexOf( ',' );
  var systems = summary.substring( 19, comma ).split( ',' );
  var year  = summary.substring( comma + 2, comma + 6 );
  var month = summary.substring( comma + 7, comma + 9 ) - 1;
  var day   = summary.substring( comma + 10, comma + 12 );
  var startHour = summary.substring( comma + 13, comma + 15 );
  var startMin  = summary.substring( comma + 16, comma + 18 );
  var endHour   = summary.substring( comma + 21, comma + 23 );
  var endMin    = summary.substring( comma + 24, comma + 26 );

  var start = Date.UTC( year, month, day, startHour, startMin );
  var end   = Date.UTC( year, month, day, endHour, endMin );
  if ( end < start ) end += ( 24 * 60 * MS_PER_MINUTE );

  entryWindow.startTime = start;
  entryWindow.endTime   = end;
  entryWindow.system    = systems[ 0 ].trim( );
  loadEntryWindowData( entryWindow );

  for( var idx = 1; idx < systems.length; ++idx )
  {
    var newEntryWindow = new Object;
    newEntryWindow.startTime = start;
    newEntryWindow.endTime   = end;
    newEntryWindow.system    = systems[ idx ].trim( );
    gEntryWindowData.push( newEntryWindow );
    loadEntryWindowData( newEntryWindow );
  }
  generateEntryUIFromData( );
}

// /////////////////////////////////////// data parsing ///////////////////////////////////////////
function cleaniskData(){
  _.each( gData, function( killmail )
  {
    if(killmail.zkb != undefined){
      if(!isNaN(parseInt(killmail.zkb.totalValue)) ){
        killmail.zkb.totalValue = parseInt(killmail.zkb.totalValue);
      }
      else{
        killmail.zkb.totalValue = 0;
      }
    }
    else{
      killmail.zkb = {};
      killmail.zkb.totalValue = 0;
    }
  } );
}

function build_data( )
{
//  _.each( gData, function( element ) { parseKillRecord( element ); } );
  
  cleaniskData();
  
  handleUnknownShips();
  // Ship fielded/lost calcs
  _.each( gPlayers, function( player )
  {
    var totalLost = 0;
    var totalFielded = 0;
    _.each( player.ships, function( ship )
    {
      var fielded = 1;
      var lost = 0;
      var prevWasVictim = false;
      var lastVictimTime = 0;
      // sort kills by chronological order
      ship.kills.sort( function( lhs, rhs )
      {
        // sort predicate:  if the killtimes are equal then put the pod after the
        //                  ship in the kill list
        if ( lhs.time == rhs.time )
        {
          return isCapsule( lhs.shipTypeID ) - isCapsule( rhs.shipTypeID );
        }
        return lhs.time > rhs.time ? 1 : -1;
      } );
      // note: ship.kills MUST be sorted by time for the logic below to work
      _.each( ship.kills, function( kill )
      {
        // pf:  i don't think this is a good idea, this will end up discarding relevant kills at some point
        // ignore if same timestamp as last victim
        if( prevWasVictim && lastVictimTime != kill.time && kill.shipTypeID != 0 )
        {
          ++fielded;
        }
        prevWasVictim = kill.victim;
        if( kill.victim )
        {
          ++lost;
          lastVictimTime = kill.time;
        }
      });
      ship.lost     = lost;
      ship.fielded  = fielded;
      totalLost    += lost;
      totalFielded += fielded;
    });
    player.fielded = totalFielded;
    player.lost = totalLost;
  });
  
  parseGroupData( gData );
  
  build_teams( gGroups );
  
  // Isk calcs

  
  _.each( gData, function( killmail )
  {
    if( killmail.zkb != undefined )
    {
      _.each( gGroups, function( group )
      {
        if( group.ID == killmail.victim.allianceID )
        {
          if(!isNaN(parseInt(killmail.zkb.totalValue,10))){
            group.iskLost += parseInt(killmail.zkb.totalValue,10);
          }
        }
      } );
    }
  } );
}

function parseKillRecord( kill )
{
  // Check each kill
  assert( kill != undefined );
  assert( kill.victim != undefined );

  if( kill.zkb != undefined )
  {
    if( !isNaN(parseInt(kill.zkb.totalValue,10)) )
    {
      gSummaryIskLost += parseInt(kill.zkb.totalValue,10);
    }
  }

  // Process victim
  if ( kill.victim.shipTypeID == 32250 )
  {
    var foo = 0;
  }
  updateShip( kill.victim, kill, kill.victim );

  // Check each attacker
  _.each( kill.attackers ,function( attacker )
  {
    // Process each attacker
    updateShip( attacker, kill, kill.victim );
  } );
}

function handleUnknownShips()
{
  _.each( gPlayers, function( player )
  {
    // TODO: It seems that this algorithm simply attaches all the kills for an unknown entry to
    //       the next shipType, which is technically incorrect.
    //       It does not affect anything now since we do not use this information at this time,
    //       however should we start to do damage calculations for each ship in the fight this
    //       will mistakenly assign damage to the wrong ship type.
    //       The correct mechanism would be to process things in a chronological fashion and
    //       ignore the unknown entries as they appear.
    player.ships = _.sortBy( player.ships, function( ship ) { return ship.shipTypeID; } );
    var unknownShip = _.find( player.ships, function( ship ) { return ship.shipTypeID == 0; } );
    if( unknownShip != undefined && player.ships.length > 1 )
    {
      _.each( player.ships[ 0 ].kills, function( kill )
      {
        // push this data into the next ship in the ships array
        player.ships[ 1 ].kills.push( kill );
      });
      // remove the unknown ship
      player.ships.shift();
    }
    // Fix indexes
    _.each( player.ships, function( ship, shipIDX )
    {
      ship.index = shipIDX;
    });
  });
}

function parseGroupData( killdata )
{
  var NowTime = new Date();
  // Check each player
  _.each( gPlayers ,function( player )
  {
    updateGroup( checkGroupExists( player ), player );
  } );
  gGroups = _.sortBy( gGroups, function ( group ) { return 1 / group.players } );
  var NowTimeEnd = new Date();
}

function updateShip( player, kill, victim )
{
  var playerIndex = checkPlayerExists( player );
  var shipIndex = checkShipExists( player, playerIndex );
  var newKill = new Object;
  newKill.killID = kill.killID;
  newKill.time = kill.killTime;
  assert( victim != undefined );
  newKill.player = gPlayers[ checkPlayerExists( victim ) ];
  newKill.victim = ( player.characterID == victim.characterID );
  newKill.iskLost = 0;
  newKill.shipTypeID = player.shipTypeID;
  if ( newKill.victim )
  {
    assert( gTotalDamage != undefined );
    assert( gTotalDamage != NaN );
    assert( player.damage_taken != undefined );
    assert( player.damage_taken != NaN );
    gTotalDamage += Number(player.damage_taken);
    newKill.damage = Number(player.damage_taken);
    newKill.finalBlow = 0;
    newKill.weaponTypeID = 0;
    if ( kill.zkb != undefined && kill.zkb.totalValue != undefined )
    {
      newKill.iskLost = parseInt(kill.zkb.totalValue,10);
    }
  }
  else
  {
    newKill.damage = Number(player.damageDone);
    newKill.finalBlow = player.finalBlow;
    newKill.weaponTypeID = player.weaponID;
  }
  assert( gPlayers[ playerIndex ].ships[ shipIndex ] != undefined );
  gPlayers[ playerIndex ].ships[ shipIndex ].kills.push( newKill );
}

// Player Functions
  
function checkPlayerExists( player )
{
  assert( player.characterName != DEBUG_PLAYER );
  // this method is more complex than it needs to be due to bugs in the eve killmails themselves.
  // since these mails sometimes just decide to omit the corporation and corporationID from the data,
  // we use some logic to determine if player record being checked is actually already in the global
  // list or not
  var foundPlayer = _.find( gPlayers, function( testPlayer, index )
  {
    // if the player names are equal, either the corp ID or the alliance ID needs to match
    // as well, since for structures the player name is an empty string
    if ( player.characterName == testPlayer.name )
    {
      // player names are equal, compare the alliance IDs
      var equal = ( player.allianceID == testPlayer.allianceID );
      // since the corp ID can get left out, check to see if the player we are checking
      // has a corpID
      if ( player.corporationID != 0 )
      {
        if ( testPlayer.corporationID != 0 )
        {
          // both the player being checked and the player in the list have a corpID,
          // return the results of the corpID comparison
          return player.corporationID == testPlayer.corporationID;
        }
        // since the corpID of the entry in the list is not set we check to see if the alliance IDs
        // are equal and if so, we overwrite the empty corp information in the list's player entry
        // with those of the player being checked and fall through to returning that they are equal
        if ( equal )
        {
          testPlayer.corporationID   = player.corporationID;
          testPlayer.corporationName = player.corporationName;
        }
      }
      // player being checked does not have a corp ID, return the result of the alliance
      // comparision
      return equal;
    }
    // player names are not equal, definitely not the same player entity
    return false;
  } );
  return foundPlayer != undefined ? foundPlayer.index : addplayer( player );
}

function addplayer( player )
{
  assert( player.characterName != DEBUG_PLAYER );
  var newplayer = new Object;
  newplayer.allianceID       = player.alliance_id;
  newplayer.allianceName     = player.alliance_id;
  newplayer.corporationID    = player.corporation_id;
  newplayer.corporationName  = player.corporation_id;
  newplayer.factionID        = player.faction_id;
  newplayer.factionName      = player.faction_id;
  newplayer.id               = player.character_id;
  newplayer.name             = player.character_id; // Name;
  newplayer.ships            = [];
  newplayer.index            = gPlayers.length;
  newplayer.damageDealt      = 0;
  newplayer.damage_taken      = 0;
  gPlayers.push( newplayer );
  return newplayer.index;
}

function checkShipExists( player, playerIndex )
{
  var foundShip = _.find( gPlayers[ playerIndex ].ships, function( testShip ){ return player.shipTypeID == testShip.shipTypeID });
  return foundShip != undefined ? foundShip.index : addship( player, playerIndex );
}

function addship( player, playerIndex )
{
  if( isCapsule( player.shipTypeID ))
  {
    ++gSummaryPods;
  }
  else
  {
    ++gSummaryShips;
  }
  var newship = new Object;
  newship.kills = [];
  newship.iskLost = 0;
  newship.damage_taken = 0;
  newship.damageDealt = 0;
  newship.shipTypeID = player.shipTypeID;
  newship.index = gPlayers[ playerIndex ].ships.length
  gPlayers[ playerIndex ].ships.push( newship );
  return newship.index;
}

// Group Functions

function checkGroupExists( player )
{
  if( player.allianceID != 0 )
  {
    groupID = player.allianceID;
  }
  else
  {
    groupID = player.corporationID;
  }
  var foundGroup = _.find( gGroups, function( testGroup ) { return groupID == testGroup.ID } );
  if( foundGroup != undefined )
  {
    player.group = foundGroup;
    return foundGroup.index;
  }
  return addGroup( player );
}

function addGroup( player )
{
  var newGroup = new Object;
  if(player.allianceID != 0)
  {
    newGroup.ID = player.allianceID;
    newGroup.name = player.allianceName;
  }
  else
  {
    newGroup.ID = player.corporationID;
    newGroup.name = player.corporationName;
  }
  newGroup.factionID   = player.factionID;
  newGroup.factionName = player.factionName;
  newGroup.damageDealt = 0;
  newGroup.damage_taken = 0;
  newGroup.killed = 0;
  newGroup.players = 0;
  newGroup.iskLost = 0;
  newGroup.ships = [];
  newGroup.index = gGroups.length;
  newGroup.coalitionShortName = '';
  player.group = newGroup;
  gGroups.push( newGroup );
  return newGroup.index;
}

function updateGroup( groupIndex, player )
{
  var group = gGroups[ groupIndex ];
  ++group.players;
  // Check each ship for this player
  _.each( player.ships, function( playerShip )
  {
    var groupShip = checkGroupShipExists( group, playerShip );
    // Check each kill for this ship
    _.each( playerShip.kills ,function( kill )
    {
      if( kill.victim )
      {
        assert( group.damage_taken != undefined );
        assert( group.damage_taken != NaN );
        assert( groupShip.damage_taken != undefined );
        assert( groupShip.damage_taken != NaN );
        group.damage_taken      += kill.damage;
        groupShip.damage_taken  += kill.damage;
        groupShip.iskLost      += kill.iskLost;
      }
      else
      {
        assert( group.damageDealt != undefined );
        assert( group.damageDealt != NaN );
        assert( groupShip.damageDealt != undefined );
        assert( groupShip.damageDealt != NaN );

        group.damageDealt      += kill.damage;
        groupShip.damageDealt  += kill.damage;
      }
    } );
    groupShip.fielded += playerShip.fielded;
    groupShip.lost    += playerShip.lost;
    group.killed      += playerShip.lost;
  } );
}

function checkGroupShipExists( group, ship )
{
  var foundShip = _.find( group.ships, function( testShip ) { return ship.shipTypeID == testShip.shipID } );
  return foundShip != undefined ? foundShip : addGroupShip( ship, group );
}

function addGroupShip( ship, group )
{
  var newship = new Object;
  newship.shipID = ship.shipTypeID;
  newship.lost = 0;
  newship.fielded = 0;
  newship.iskLost = 0;
  newship.damage_taken = 0;
  newship.damageDealt = 0;
  newship.index = group.ships.length;
  group.ships.push( newship );
  return newship;
}

function build_teams( groups )
{
  gTeams = [ [],[] ];
  _.each( groups, function( group, index )
  {
    var dmgTakenFactor = Math.round( group.damage_taken / gTotalDamage * 1000 ) / 10;
    var dmgDealtFactor = Math.round( group.damageDealt / gTotalDamage * 1000 ) / 10;
    var playerFactor   = Math.round( group.players / Math.min( gPlayers.length, 1000 ) * 1000 ) / 10;
//    console.log( group.name + ' damage taken: ' + group.damage_taken + ' (' + dmgTakenFactor + '%)' );
//    console.log( group.name + ' damage done : ' + group.damageDealt + ' (' + dmgDealtFactor + '%)' );
//    console.log( group.name + ' involved    : ' + group.players + ' (' + playerFactor + '%)' );
    
    // Decide if group is insignificant
    // test
    // http://evf-eve.com/services/brcat/?s=3726&b=6044760&e=1740&t=dQQfLdGGcaQaGaaaaaaai
    if ( dmgTakenFactor < 1 && dmgDealtFactor < 1 && playerFactor < 1 && gOptIgnoreInsig)
    {
//      group.name += ' (*)';
      group.team = -1;
    }
    else
    {
      var team;
      if ( gLoadTeams.length > 0 )
      {
        team = gLoadTeams[ index ] == undefined ? 0 : gLoadTeams[ index ];
      }
      else
      {
        // if we are loading extra data, use the existing team assignment we saved
        if(gCurrentTeams.length > 0)
        {
          // Default Team is red
          team = 1;
          _.each(gCurrentTeams, function(currentTeam, currentTeamIdx){
            team = ( _.find( currentTeam, function( X ) { return X == group.ID+ ''; } ) == undefined ) ? team : currentTeamIdx;
          });
        }
        else
        {
          team = ( _.find( gBlueTeams, function( X ) { return X == group.ID; } ) == undefined ) ? 1 : 0;
        }
      }
      while( team >= gTeams.length )
      {
        gTeams.push( [] );
      }
      gTeams[ team ].push( index );
      group.team = team;
    }
  } );
  addTeamTabs( );
}


function assign_group_to_team( targetTeam, groupIndex )
{
  var currentTeam = getTeam( gGroups[ groupIndex ].ID );
  if ( currentTeam == 0 )
  {
    // note:  the adding of the empty string forces the ID into a string, which is
    //        necessary since all the cookies are strings
    gBlueTeams = _.without( gBlueTeams, gGroups[ groupIndex ].ID + '' );
    writeCookies( );
  }
  gGroups[ groupIndex ].team = targetTeam;
  var oldTeam = _.without( gTeams[ currentTeam ], groupIndex );
  gTeams[ currentTeam ] = oldTeam;
  if( gTeams.length > targetTeam )
  {
    gTeams[ targetTeam ].push( groupIndex );
  }
  else
  {
    var newTeam = [];
    gTeams.push( newTeam );
    gTeams[ targetTeam ].push( groupIndex );
  }
  if ( targetTeam == 0 )
  {
    gBlueTeams.push( gGroups[ groupIndex ].ID + '' );
    writeCookies( );
  }
}

function delete_team( teamIdx )
{
  profile( 'removeTeamTabs',       function( ) { removeTeamTabs( ); } );
  gTeams.splice( teamIdx, 1 );
  profile( 'addTeamTabs',          function( ) { addTeamTabs( ); } );
  profile( 'refresh',              function( ) { refresh( ); } );
}

function MakeSpan( val )
{
  return '<span class="ui-state-default ui-state-error ui-corner-all ux-summaryBox">' + val + '</span>';
}

function generateSummary( startTime, endTime, lastKillTime, workingFlag )
{
  summaryIskLost = roundIsk( gSummaryIskLost );

  var outputText = 'Total lost';
  if ( workingFlag )
    outputText += ' so far';
  else
  {
    addTab( 10,  'Involved',       'involvedTable',     function( ) { generateInvolved( '#involvedTable' ); } );
    addTab( 20,  'Class Summary',  'classSummaryTable', function( ) { draw_class_summary_table( '#classSummaryTable' ); } );
    addTab( 30,  'Ship Summary',   'summaryTable',      function( ) { draw_summary_table( '#summaryTable',gTeams ); } );
    addTab( 40,  'Timeline',       'timeLine',          function( ) { generateBattleTimeline( '#timeLine' ); } );
    addTab( 50,  'Replay',       'animTab',          function( ) { generateAnimation( '#animTab' ); } );
    addTab( 400, 'Chart',          'chartTab',          function( ) { draw_charts(); } );
    addTab( 500, 'Kill List',      'ktl',               function( ) { draw_kill_table(); } );
  }
  outputText    += ': '          + MakeSpan( summaryIskLost );
  outputText    += ' Players: '  + MakeSpan( gPlayers.length );
  outputText    += ' Ships: '    + MakeSpan( gSummaryShips );
  outputText    += ' Pods: '     + MakeSpan( gSummaryPods );
  $('#summaryText').empty( );
  $('#summaryText').append( outputText );
}

