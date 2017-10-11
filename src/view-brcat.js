function generateTable( headerData, rowData, id , colspan )
{
  if( colspan == undefined )
  {
    colspan = [ 0, 0 ];
  }
  var table = [];
  table.push( '<table class="tablesorter ui-widget" id="'+ id +'"><thead><tr>' );
  _.each(headerData, function(header, headerIDX)
  {
    if ( headerIDX >= colspan[ 0 ] && colspan[ 0 ] != 0)
    {
      if (( headerIDX - colspan[ 0 ] ) % colspan[ 1 ] == 0 )
      {
        table.push( '<th colspan="'+colspan[1]+'">'+ header +'</th>' );
      }
    }
    else
    {
      table.push( '<th>' + header + '</th>' );
    }
  });
  table.push( '</tr></thead><tbody class="status">' );
  _.each( rowData, function( row )
  {
    table.push( '<tr>' );
    _.each( row, function( data )
    {
      if( String( data ).substring( 0, 3 ) == '<td' )
      {
        table.push( data );
      }
      else
      {
        table.push( '<td class="killText">'+ data +'</td>' );
      }
    });
    table.push( '</tr>' );
  });
  table.push( '</tbody></table>' );
  return table.join( '' );
}

function buildKillTable( )
{
  var headerData = [
    //'#',
    '',
    'Name',
    '',
    'Alliance',
    //'Inv',
    'DMG(k)',
    '',
    'Ship',
    'Type',
    'System',
    'Time',
    //'ID',
    'ISK(M)'
  ];
  var rowDataAllTeams = [];
  _.each( gTeams, function( team )
  {
    var rowData = [];
    rowDataAllTeams.push( rowData );
  });

  _.each( gData, function( killMail, killMailIdx )
  {
    var groupID = killMail.victim.allianceID;
    if( groupID == 0)
    {
      groupID = killMail.victim.corporationID;
    }
    var isk = '?';
    if( killMail.zkb != undefined )
    {
      var isk = roundIsk( killMail.zkb.totalValue );
    }
    var row = [
      //killMailIdx,
      eveImageLink( 'Character', killMail.victim.characterID ), zKillLink( 'character', killMail.victim.characterID, killMail.victim.characterName ),
      eveImageLink( 'Alliance', killMail.victim.allianceID ),   zKillLink( 'alliance', killMail.victim.allianceID, killMail.victim.allianceName ),
      //killMail.attackers.length,
      Math.round( killMail.victim.damage_taken / 1000 ),
      eveImageLink( 'Render', killMail.victim.shipTypeID ),     zKillLink( 'detail', killMail.killID, shipTypeIDtoName( killMail.victim.shipTypeID )),
      shipTypeIDtoType( killMail.victim.shipTypeID ),
      solarSystemIDtoName(killMail.solarSystemID),
      killMail.killTime.split( ' ' )[ 1 ].slice(0,-3),
      //killMail.killID,
      isk
    ];
    if( getTeam( groupID ) > -1 )
    {
      rowDataAllTeams[ getTeam( groupID ) ].push( row );
    }
  });
  console.log( headerData );

  rowDataAllTeams.push( headerData );
  return rowDataAllTeams;
}

function draw_team_kill_table( index )
{
  var rowDataAllTeams =  buildKillTable( );
  var headerData = rowDataAllTeams.pop( );
  var team = gTeams[ index ];

  if( team.length != 0 )
  {
    var target = 'teamSummary' + index;
    var output = generateTable( headerData, rowDataAllTeams[ index ], target + 'Table' );
    $( '#'+target ).empty( );
    $( '#'+target ).append( output );
    $( '#'+target+'Table').tablesorter({ sortList: [[8,1],[9,1]] } );
  }
}

function getIskSummary()
{
  var iskLostArray = [];
  _.each(gTeams, function(team){
    iskLostArray.push(0);
  });
  var shipsLostArray = [];
  _.each(gTeams, function(team){
    shipsLostArray.push(0);
  });
  
  
  _.each(gGroups, function(group)
  {
    var targetTeam = getTeam( group.ID );
    if(targetTeam != -1)
    {   
     iskLostArray[targetTeam] += Number(group.iskLost);
     _.each(group.ships, function(ship){
        shipsLostArray[targetTeam] += Number(ship.lost);
     });
    }
  });
  
  return [iskLostArray,shipsLostArray];
}

function draw_summary_table( target, teams )
{
  var SHIP_ID_INDEX = 0;
  var SHIP_NAME_INDEX = 1;
  var SHIP_CLASS_INDEX = 2;
  var SHIP_ORDER_INDEX = 3;
  var SHIP_FIELDED_INDEX = 4;
  var SHIP_LOST_INDEX = 5;
  var SHIP_ISKLOST_INDEX = 6;
  var TEAM_DATA_SIZE = 3;
  var SHIP_DATA_SIZE = 4;
  var FORMAT_TEAM_DATA_SIZE = 2;
  var FORMAT_SHIP_DATA_SIZE = 2;
  var FORMAT_SHIP_NAME_INDEX = 1;
  var FORMAT_SHIP_IMG_INDEX = 0;
  
  var tableData = [];
  _.each(gGroups, function(group)
  {
    _.each(group.ships, function(ship)
    {
      var exists = _.find(tableData, function(row){return row[0] == ship.shipID });
      var targetTeam = getTeam( group.ID );
      if(targetTeam != -1)
      {
        if( exists != undefined )
        {
          exists[(targetTeam*TEAM_DATA_SIZE)+SHIP_FIELDED_INDEX] += ship.fielded;
          exists[(targetTeam*TEAM_DATA_SIZE)+SHIP_LOST_INDEX] += ship.lost;
          exists[(targetTeam*TEAM_DATA_SIZE)+SHIP_ISKLOST_INDEX]+= ship.iskLost;
        }
        else
        {
          var rowData = createEmptyArray( SHIP_DATA_SIZE+(teams.length*TEAM_DATA_SIZE) );
          rowData[SHIP_ID_INDEX] = ship.shipID;
          rowData[SHIP_NAME_INDEX] = shipTypeIDtoName(ship.shipID);
          rowData[SHIP_CLASS_INDEX] = getShipClass(ship.shipID);
          rowData[SHIP_ORDER_INDEX] = getShipClassOrder(ship.shipID);
          rowData[(targetTeam*TEAM_DATA_SIZE)+SHIP_FIELDED_INDEX] = ship.fielded;
          rowData[(targetTeam*TEAM_DATA_SIZE)+SHIP_LOST_INDEX] = ship.lost;
          rowData[(targetTeam*TEAM_DATA_SIZE)+SHIP_ISKLOST_INDEX] = ship.iskLost;
          tableData.push(rowData);
        }
      }
    });
  });
  
  tableData = _.sortBy(tableData, function(rowData){ return rowData[SHIP_ORDER_INDEX];});
  
  var totalData = createEmptyArray( SHIP_DATA_SIZE+(teams.length*TEAM_DATA_SIZE) );
  _.each(tableData , function(rowData){
    for( var i=0; i < teams.length; ++i )
    {
      // ignore capsules from the ship fielded and lost totals
      if( rowData[SHIP_ID_INDEX] != 670 && rowData[SHIP_ID_INDEX] != 33328 )
      {
        totalData[(i*TEAM_DATA_SIZE)+SHIP_FIELDED_INDEX] += rowData[(i*TEAM_DATA_SIZE)+SHIP_FIELDED_INDEX];
        totalData[(i*TEAM_DATA_SIZE)+SHIP_LOST_INDEX] += rowData[(i*TEAM_DATA_SIZE)+SHIP_LOST_INDEX];

      }
      totalData[(i*TEAM_DATA_SIZE)+SHIP_ISKLOST_INDEX] += rowData[(i*TEAM_DATA_SIZE)+SHIP_ISKLOST_INDEX];
    }
  });
  
  var formattedTotalData = createEmptyArray((teams.length*FORMAT_TEAM_DATA_SIZE)+FORMAT_SHIP_DATA_SIZE);
  formattedTotalData[FORMAT_SHIP_NAME_INDEX] = 'Totals';
  formattedTotalData[FORMAT_SHIP_IMG_INDEX] = ' ';
  for( var i=0; i < teams.length; ++i ){
    var shipLost    = totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_LOST_INDEX ];
    var shipFielded = totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_FIELDED_INDEX ];
    var iskLost     = totalData[ ( i * TEAM_DATA_SIZE ) + SHIP_ISKLOST_INDEX ];

    formattedTotalData[ i + FORMAT_SHIP_DATA_SIZE ]                = tableDataHelper( i, shipFielded, shipLost + ' / ' + shipFielded );
    formattedTotalData[ i + FORMAT_SHIP_DATA_SIZE + teams.length ] = tableDataHelper( i, iskLost, roundIsk( iskLost ));
  }
 
  var formattedData = [];
  formattedData.push(formattedTotalData);
  
  _.each(tableData, function(rowData)
  {
    var formattedRowData = createEmptyArray((teams.length*FORMAT_TEAM_DATA_SIZE)+FORMAT_SHIP_DATA_SIZE);
    formattedRowData[FORMAT_SHIP_NAME_INDEX] = rowData[SHIP_NAME_INDEX];
    formattedRowData[FORMAT_SHIP_IMG_INDEX] = eveImageLink( 'Render', rowData[SHIP_ID_INDEX] );
    for( var i=0; i < teams.length; ++i )
    {
      var shipLost    = rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_LOST_INDEX ];
      var shipFielded = rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_FIELDED_INDEX ];
      var iskLost     = rowData[ ( i * TEAM_DATA_SIZE ) + SHIP_ISKLOST_INDEX ];

      formattedRowData[ i + FORMAT_SHIP_DATA_SIZE ]                = tableDataHelper( i, shipFielded, shipLost + ' / ' + shipFielded );
      formattedRowData[ i + FORMAT_SHIP_DATA_SIZE + teams.length ] = tableDataHelper( i, iskLost, roundIsk( iskLost ));
    }
    formattedData.push(formattedRowData);
  });
  
  var headerData = [ '','ShipType' ];
  for( var i = 0; i < teams.length; ++i )
  {
    headerData.push( 'Lost / Fielded' );
    
  }
  for( var i = 0; i < teams.length; ++i )
  {
    headerData.push( 'ISK lost' );
  }
  var outputHtml = generateTable( headerData, formattedData, 'summaryShipType' , [FORMAT_SHIP_DATA_SIZE,teams.length]);
  
  $( target ).empty( );
  $( target ).append( outputHtml );
  
}

function draw_localStorageTable()
{
  var localStorageTable = load_LS_table();
  lstText = '';
  //lstText += '<div class="status">Saved Battles</div>';
  var loop = ['date','size','formvalues','index'];
  _.each(loop, function(column)
  {
    lstText += '<div style="float: left;">';
    lstText += '<ol class="summaryclass">';
    lstText += '<div class="status">'+column+'</div>';
    _.each( localStorageTable, function( LST_item )
    {
      lstText += '<li>'
      lstText += '<div class="view-listitem">';
      lstText += LST_item[column] + ' ';
      lstText += '</div>';
      lstText += '</li>';
    });
    lstText += '</ol>';
    lstText += '</div>';
  });
  lstText += '<br style="clear: left;">';
  
  $( '#LSTable' ).empty( );
  $( '#LSTable' ).append( lstText );
}

function draw_kill_table()
{
  var rowDataAllTeams =  buildKillTable( );
  var headerData = rowDataAllTeams.pop( );
  var combinedRowData = [];
  _.each(rowDataAllTeams, function(rowData){
    combinedRowData = combinedRowData.concat(rowData);
  });
  var target = 'ktl';
  var output = generateTable(headerData, combinedRowData, target+'Table');
  $( '#'+target ).empty( );
  $( '#'+target ).append( output );
  $( '#'+target+'Table').tablesorter({ sortList: [[8,1],[9,1]] } );
}

// takes a team index ( used to determine the text color ), a numeric condition, and some content.
// creates a table data HTML element and includes the content and some additional styling 
function tableDataHelper( tIdx, condition, content )
{
  var data = '<td';
  if ( condition > 0 )
  {
    data += ' align="center" class="' + TEAM_COLORS[ tIdx ] + '">' + content;
  }
  else
  {
    data += '>';
  }
  return data + '</td>';
}

function draw_class_summary_table( target )
{
  var shipClasses;

  profile( 'classSummary-pluck', function( ) {
    shipClasses = _.uniq( _.pluck( gShipTypes, "G" ));
  } );

  var sumTable = [];
  var totalItem = new Object;
  totalItem.fielded   = createEmptyArray( gTeams.length );
  totalItem.lost      = createEmptyArray( gTeams.length );
  totalItem.iskLost   = createEmptyArray( gTeams.length );
  totalItem.dmgDealt  = createEmptyArray( gTeams.length );
  totalItem.dmgTaken  = createEmptyArray( gTeams.length );
  profile( 'classSummary-calculate', function( ) {
    _.each( gGroups, function( group, groupIDX )
    {
      _.each( group.ships, function( ship )
      {
        var itemfound = false;
        var shipClass = _.find( gShipTypes, function( item ) { return item.I == ship.shipID; } );
        if ( shipClass == undefined )
        {
          var i = 0;
          return;
        }
        var sumTableItem = _.find( sumTable, function( item ) { return item.shipClass == shipClass.G; } );
        if ( sumTableItem == undefined )
        {
          sumTableItem = new Object;
          sumTableItem.shipClass = shipClass.G;
          sumTableItem.order     = shipClass.O;
          sumTableItem.fielded   = createEmptyArray( gTeams.length );
          sumTableItem.lost      = createEmptyArray( gTeams.length );
          sumTableItem.iskLost   = createEmptyArray( gTeams.length );
          sumTableItem.dmgDealt  = createEmptyArray( gTeams.length );
          sumTableItem.dmgTaken  = createEmptyArray( gTeams.length );
          sumTable.push( sumTableItem );
        }
        var targetTeam = -1;
        _.each( gTeams, function( team, teamIDX )
        {
          if( _.contains(team, groupIDX ))
          {
            targetTeam = teamIDX;
          }
        } );
        if( targetTeam != -1 )
        {
          assert( ship.fielded >= 0 );
          assert( ship.lost >= 0 );
          assert( ship.damageDealt >= 0 );
          assert( ship.damage_taken >= 0 );
          assert( ship.iskLost >= 0 );
          sumTableItem.fielded[ targetTeam ]  += ship.fielded;        
          sumTableItem.lost[ targetTeam ]     += ship.lost;           
          sumTableItem.dmgDealt[ targetTeam ] += ship.damageDealt;    
          sumTableItem.dmgTaken[ targetTeam ] += ship.damage_taken;    
          sumTableItem.iskLost[ targetTeam ]  += ship.iskLost;

          // ignore capsules from the ship totals
          if( ship.shipID != 670 && ship.shipID != 33328 )
          {
            totalItem.fielded[ targetTeam ]   += ship.fielded;         
            totalItem.lost[ targetTeam ]      += ship.lost;
          }
          totalItem.iskLost[ targetTeam ]     += ship.iskLost;     
          totalItem.dmgDealt[ targetTeam ]    += ship.damageDealt;     
          totalItem.dmgTaken[ targetTeam ]    += ship.damage_taken;         
        }
      } );
    } );
  } );
  //console.log( sumTable );
  sumTable = _.sortBy( sumTable, function( sumTblItem )
  {
    var total = 0;
    _.each( sumTblItem.fielded, function( fielded )
    {
      total += fielded;
    } );
    return 1 / total;
  } );

  var html = [];
//  sumTableTxt += '<div class="status">Summary of Fielded/Destroyed Ships</div>';

  html.push( '<table class="view-classSummary ui-widget">' );
  html.push( '<tr>' );
  html.push( '  <td></td>' );
  html.push( '  <td align="center" colspan="' + gTeams.length + '">Lost / Fielded</td>' );
  html.push( '  <td align="center" colspan="' + gTeams.length + '">ISK lost</td>' );
//  html.push( '  <td align="center" colspan="' + gTeams.length + '">Damage Done</td>' );
//  html.push( '  <td align="center" colspan="' + gTeams.length + '">Damage Taken</td>' );
  html.push( '</tr>' );

  html.push( '<tr>' );
  html.push( '  <td></td>' );
  var countCol = [];
  var iskCol   = [];
  var takenCol = [];
  var dealtCol = [];

  var tmpTable = _.sortBy( sumTable, function( item ) { return parseInt( item.order ); } );
  
  _.each( gTeams, function( team, tIdx )
  {
    countCol.push( tableDataHelper( tIdx, 1, totalItem.lost[ tIdx ] + ' / ' + totalItem.fielded[ tIdx ] ));
    iskCol.push( tableDataHelper( tIdx, 1, roundIsk( totalItem.iskLost[ tIdx ] )));
//    dealtCol.push( tableDataHelper( tIdx, 1, roundIsk( totalItem.dmgDealt[ tIdx ] )));
//    takenCol.push( tableDataHelper( tIdx, 1, roundIsk( totalItem.dmgTaken[ tIdx ] )));
  } );
  html.push( countCol.join( '' ) + iskCol.join( '' ) + dealtCol.join( '' ) + takenCol.join( '' ));
  html.push( '</tr>' );

  var row = 0;
  _.each( tmpTable, function( sumTableItem )
  {
    // every 4th row put in a thin row that contains a single border line as a divider
    if ( row++ % 4 == 0 )
    {
      html.push( '<tr><td colspan=' + ( gTeams.length * 2 + 1 ) + ' class="view-divider"></td></tr>' );
    }
    html.push( '<tr>' );
    html.push( '<td>' + sumTableItem.shipClass + '</td>' );
    countCol.length = 0;
    iskCol.length = 0;
    takenCol = [];
    dealtCol = [];
    _.each( gTeams, function( team, tIdx )
    {
      countCol.push( tableDataHelper( tIdx, sumTableItem.fielded[ tIdx ], sumTableItem.lost[ tIdx ] + ' / ' + sumTableItem.fielded[ tIdx ] ));
      iskCol.push( tableDataHelper( tIdx, sumTableItem.iskLost[ tIdx ], roundIsk( sumTableItem.iskLost[ tIdx ] )));
//      dealtCol.join( tableDataHelper( tIdx, sumTableItem.dmgDealt[ tIdx ], roundIsk( sumTableItem.dmgDealt[ tIdx ] )));
//      takenCol.join( tableDataHelper( tIdx, sumTableItem.dmgTaken[ tIdx ], roundIsk( sumTableItem.dmgTaken[ tIdx ] )));
    } );
    html.push( countCol.join( '' ));
    html.push( iskCol.join( '' ));
    html.push( dealtCol.join( '' ));
    html.push( takenCol.join( '' ));
    html.push( '</tr>' );
  } );
  html.push( '</table>' );
  html.push( '<br style="clear: left;">' );

  $( target ).empty( );
  $( target ).append( html.join( '' ));
}

function initInvolvedEntry( player )
{
  var invEntry = new Object;
  invEntry.allianceName = player.allianceName;
  invEntry.corporationName = player.corporationName;
  invEntry.corporationID = player.corporationID;
  invEntry.allianceID = player.allianceID;
  invEntry.playerName = player.name;
  invEntry.playerID = player.id;
  invEntry.victim = false;
  invEntry.time = 0;
  invEntry.podKillID = 0;
  invEntry.shipID = -1;
  invEntry.kills = 0;
  return invEntry;
}

function buildInvolved()
{
  var involved  = [];
  var teamLosses = [];
  for( var i = 0; i < gTeams.length; ++i )
  {
    involved.push( [] );
    teamLosses[ i ] = 0;
  }

  profile( 'involved-genTempData', function( ) {
    // iterate through all the players once to generate the involved entries
    _.each( gPlayers, function( player, playerIdx )
    {
      assert( player.group.team < involved.length );
      assert( player.name != DEBUG_PLAYER );
      var tempData = [];
      // team == -1 if the group is considered 'insignificant'
      if ( player.group.team >= 0 )
      {
        _.each( player.ships, function( ship, shipIdx )
        {
          var invEntry = initInvolvedEntry( player );
//          invEntry.kills = ship.kills.length;
          teamLosses[ player.group.team ] += ship.lost;
          var temp = _.find( gShipTypes, function( X ) { return X.I == ship.shipTypeID; } );
          if ( temp != undefined )
            console.log( '(' + teamLosses[ player.group.team ] + ') adding ' + ship.lost + ' loss(es) to team #' + player.group.team + ' for ' + player.name + '(' + player.corporationName + ') [' + player.allianceName + ']: ' + temp.N );
          // this assumes the kills list is sorted
          _.each( ship.kills, function( kill, killIdx )
          {
            invEntry.shipID = ship.shipTypeID;
            invEntry.time   = kill.time;
            if ( kill.victim )
            {
              invEntry.victim = true;
              invEntry.killID = kill.killID;
              invEntry.shipData = _.find( gShipTypes, function( X ) { return X.I == invEntry.shipID; } );
              if ( invEntry.shipData == undefined )
              {
                var j = 0;
                invEntry.shipData = _.find( gShipTypes, function( X ) { return X.I == 0; } );
              }
              tempData.push( invEntry );
              invEntry = initInvolvedEntry( player );
            }
            else
            {
              if ( player.group.team != kill.player.group.team )
              {
                ++invEntry.kills;
              }
            }
          } );
          // Only add the unkilled ship entry if number fielded is greater than number lost
          if( ship.fielded > ship.lost && !isCapsule( invEntry.shipID ))
          {
            if ( invEntry.shipID >= 0 )
            {
              invEntry.shipData = _.find( gShipTypes, function( X ) { return X.I == invEntry.shipID; } );
              if ( invEntry.shipData == undefined )
              {
                var j = 0;
                invEntry.shipData = _.find( gShipTypes, function( X ) { return X.I == 0; } );
              }
              tempData.push( invEntry );
            }
          }
        } );
      }
      tempData.sort( function( lhs, rhs )
      {
        // sort predicate:  if the killtimes are equal then put the pod after the
        //                  ship in the kill list
        if ( lhs.time == rhs.time )
        {
          return isCapsule( lhs.shipID ) - isCapsule( rhs.shipID );
        }
        return lhs.time > rhs.time ? 1 : -1;
      } );
      var prevEntry = undefined;
      // iterate through the tempData list of involved ships for the player and link
      // any pod deaths to the death immediately preceeding it in the chronological list
      _.each( tempData, function( invEntry )
      {
        if ( invEntry.victim && isCapsule( invEntry.shipID ) && prevEntry != undefined )
        {
          prevEntry.podKillID = invEntry.killID;
        }
        else
        {
          if ( prevEntry != undefined )
            involved[ player.group.team ].push( prevEntry );
          prevEntry = invEntry;
        }
      } );
      if ( prevEntry != undefined )
        involved[ player.group.team ].push( prevEntry );

    } );
  } );
  
  profile( 'involved-sortByShipClass and Player', function( ) {
    // sort each team with the lowest ship type at the top, with a secondary sort key of the player name
    for( var i = 0; i < gTeams.length; ++i )
    {
      involved[ i ].sort( function( lhs, rhs )
      {
        if ( lhs.shipData.O == rhs.shipData.O )
        {
          //forced lhs and rhs playernames to strings to deal with code failing if it encounters an integer
          return String(lhs.playerName).toUpperCase( ) > String(rhs.playerName).toUpperCase( ) ? 1 : -1;
        }
        return lhs.shipData.O > rhs.shipData.O ? 1 : -1;
      } );
    }
  } );
  var totalLosses = 0;
  for( var i = 0; i < gTeams.length; ++ i )
  {
    totalLosses += teamLosses[ i ];
  }
  
  var returnArray = [];
  returnArray.push(totalLosses);
  returnArray.push(involved);
  returnArray.push(teamLosses);
  return returnArray;
}

function setAnimationGroup()
{
  var dropdown = $( "#ux-animationGroupBy" );
  gAnimationGroup = dropdown.val( );
  refresh( );
}

function setAnimationWidth()
{
  var dropdown = $( "#ux-animationWidth" );
  gAnimationWidth = dropdown.val( );
  refresh( );
}

function setAnimationFilter()
{
  var dropdown = $( "#ux-animationFilter" );
  if(dropdown.val( )=='Kills'){
    gShowKillsOnly = true;
  }
  else{
    gShowKillsOnly = false;
  }
  refresh( );
}

function setAnimationSpeed()
{
  var dropdown = $( "#ux-animationSpeed" );
  gAnimationSpeed = Number(dropdown.val());
  refresh( );
}

function setAnimationLabel()
{
  var dropdown = $( "#ux-animationLabel" );
  if(dropdown.val()=='On'){
    gAnimationLabel = true;
  }
  else{
    gAnimationLabel = false;
  }
  refresh();
}

function setAnimationSort()
{
  var dropdown = $( "#ux-animationSort" );
  if(dropdown.val()=='Size'){
    gAnimationSort = true;
  }
  else{
    gAnimationSort = false;
  }
  refresh();
}

function setAnimationScale()
{
  var dropdown = $( "#ux-animationScale" );
  if(dropdown.val()=='100%'){
    gAnimationScale = true;
  }
  else{
    gAnimationScale = false;
  }
  refresh();
}

function  setRIDtext(teamIDX,invIndex)
{
  //p123-2
  
  if(gLastHighlightShip.length>0){
    if(gLastHighlightShip[0] == teamIDX && gLastHighlightShip[1] == invIndex){
      closeRIDbox();
      return;
    }
  }

  var p1 = $('#tabs').offset();
  var p2 = $('#p'+invIndex+'-'+teamIDX).offset();
  var currentWidth = $( document ).width();
  var leftPos = (currentWidth - 350) > (p2.left-p1.left) ? (p2.left-p1.left) : (currentWidth - 350);
  $('#replayInfoDiv').show();
  $('#replayInfoDiv').animate({'left' : leftPos+'px', 'top' : (p2.top-p1.top)+ (gAnimationScale ? 36 : 20) +'px'});
  
  var target = gCalculatedInvolved[teamIDX][invIndex];
  $('#RIDname').empty();
  $('#RIDname').append('<img src="https://image.eveonline.com/Character/'+target.playerID+'_32.jpg" style="width: 16px;">'+target.playerName);
  $('#RIDship').empty();
  $('#RIDship').append(target.shipData.N);
  $('#RIDcorp').empty();
  $('#RIDcorp').append('<img src="https://image.eveonline.com/Corporation/'+target.corporationID+'_32.png" style="width: 16px;">'+target.corporationName);
  $('#RIDalliance').empty();
  $('#RIDalliance').append('<img src="https://image.eveonline.com/Alliance/'+target.allianceID+'_32.png" style="width: 16px;">'+target.allianceName);
  $('#RIDclass').empty();
  $('#RIDclass').append(target.shipData.G);
  $('#RIDkills').empty();
  
  $('#RIDkills').append(target.kills);
  if(target.victim){
    $('#killedRow').show();
    $('#RIDkilled').empty();
    $('#RIDkilled').append(target.time);
    $('#RIDisk').empty();
    $('#RIDisk').append(roundIsk(target.iskLost));
  }
  else{
    $('#killedRow').hide();
  }
  console.log('Target: '+JSON.stringify(target));

  
 // begin highlight
  
  highlightFrame( false );
  
  
  if( gLastHighlightShip.length > 0 ){
    highlightShip( gLastHighlightShip[1], gLastHighlightShip[0], false );
  }
  if( gLastHighlight.length > 0 ){
      highlightAttacker( false, gLastHighlight );
  }
  if( gLastHighlightAggro.length > 0 ){
    highlightAggressor( false, gLastHighlightAggro );
  }
  
  // Highlight this ship
  var thisHighlightShip = [teamIDX,invIndex];
  highlightShip( invIndex, teamIDX, true );
  gLastHighlightShip = thisHighlightShip;
  
   // Higlight attackers

  if(target.victim){
    var thisHighlight = target.attackers;
    highlightAttacker( true, thisHighlight );
    gLastHighlight = thisHighlight;
  }
  else{
    gLastHighlight = [];
  }
  // Higlight aggressors
  
  if(target.aggressor != undefined){
    var thisHighlightAggro = target.aggressor;
    highlightAggressor( true, thisHighlightAggro )
    gLastHighlightAggro = thisHighlightAggro;
  }
  else{
    gLastHighlightAggro = [];
  }
}

function buildInfoDiv()
{
  html = [];
  html.push('<div id="replayInfoDiv" class="absolute">');
  html.push('<table style="background-color: black;">');
  html.push('<tr><td>Name:</td><td><div id="RIDname"></div></td><td>Corp:</td><td><div id="RIDcorp"></div></td><td style="text-align: right;"><img src="./close.png" id="closeButton" onclick="closeRIDbox()"></td></tr>' );
  html.push('<tr><td>Ship:</td><td><div id="RIDship"></div></td><td>Alliance:</td><td colspan ="2"><div id="RIDalliance"></div></td></tr>' );
  html.push('<tr><td>Class:</td><td><div id="RIDclass"></div></td><td>Kills:</td><td><div id="RIDkills"></div></td></tr>' );
  html.push('<tr id="killedRow"><td>Killed:</td><td><div id="RIDkilled"></div></td><td>IskLost:</td><td><div id="RIDisk"></div></td></tr>' );
  html.push('</table>');
  html.push('</div>');
  return html;
}

function closeRIDbox()
{
  $('#replayInfoDiv').hide();
  highlightAttacker( false, gLastHighlight );
  highlightAggressor( false, gLastHighlightAggro );
  highlightShip( gLastHighlightShip[1], gLastHighlightShip[0], false );
  gLastHighlight = [];
  gLastHighlightAggro = [];
  gLastHighlightShip = [];
  highlightFrame( true );
}

function addOffset(endTime){
  if(endTime > gAnimationOffset){
    gAnimationOffset += gAnimationSpeed;
  }
  else{
    gAnimationPlaying = false;
  }
  refresh( );
}


function reduceOffset(){
  if(0 < gAnimationOffset){
    gAnimationOffset --;
  }
  refresh( );
}

function startOffset(){
  gAnimationOffset = 0;
  refresh( );
}

function endOffset(endTime){
  gAnimationOffset = endTime;
  refresh( );
}

function playOffset(endTime){
  
  if(!gAnimationPlaying){
    gAnimationPlaying = true;
    playLoop(endTime);
  }
}

function pauseOffset(){
  if(gAnimationPlaying){
    gAnimationPlaying = false;
  }
}

function playLoop(endTime){
  if(gAnimationPlaying){
    addOffset(endTime);
    setTimeout(function(){playLoop(endTime);},1000);
  }
}

function offsetInputChange()
{
  var offsetInput = $( "#offsetInput" );
  gAnimationOffset = offsetInput.val( );
  refresh( );
}

// Returns array of attackers for given killID
function getAttackers(killID)
{
  var attackers = [];
  var thisKill = _.find(gData, function(kill){return kill.killID ==killID});
  _.each(thisKill.attackers, function(attacker){
    attackers.push(attacker.characterID);
  });
  return attackers;
}

function getAttackersAndShip(killID)
{
  var attackers = [];
  var thisKill = _.find(gData, function(kill){return kill.killID ==killID});
  _.each(thisKill.attackers, function(attacker){
    attackers.push([attacker.characterID, attacker.shipTypeID]);
  });
  return attackers;
}

function buildMainWindow(involved)
{
  html = [];
  html.push( '<table class="view-involved"><tr class="view-involved">' );
  _.each(involved, function(team, teamIDX){
    html = html.concat( buildTeamHeading(team, teamIDX) );
  });
  // close tags
  html.push( '</tr></table>' );
  return html;
}

function buildTeamHeading(team, teamIDX)
{
  html = [];
  // Start team window
  html.push( '<td>' );
  html.push( '<table>' );
   // Isk header
  html.push( '<tr>' );
  html.push( '<div class="animIsk" id="team'+ teamIDX +'isk"></div>' );
  html.push( '<div id="team'+ teamIDX +'chart"></div>' );
  html.push( '</tr>' );
  html.push( '</table>' );
  //html.push( '<table>' );
  
  if(gShowKillsOnly){
    var offsetTime = new Date( Date.parse(gMinDateTime) + (60000*gAnimationOffset) );
    var newTeam = [];
    _.each(team, function(member) {
      var thisTime = new Date(member.time.replace(/-/g,"/"));
      if(thisTime <= offsetTime){
        if(member.victim){
          newTeam.push(member);
        }
      }
    });
    team = newTeam;
  }
  
  // create array with blocks of ships
  if(gAnimationGroup == 'Type'){
    var blockList = _.groupBy(team, function(member){return member.shipData.I;});
    blockList = _.sortBy(blockList, function(member){ return member[0].shipData.O;});

  }
  else if(gAnimationGroup == 'Class'){
    var blockList = _.groupBy(team, function(member){return member.shipData.G;});

  }
  else if(gAnimationGroup == 'None'){
    blockList= [team];
  }
  
  if(gAnimationSort && gAnimationGroup != 'None'){
    blockList = _.sortBy(blockList, function(member){ return -1 * member.length;});
  }
  //var chartDataArray = [];
  //var chartLabelArray = [];
  

  
  _.each(blockList, function(block){
    //var chartData = block.length;
    //var chartLabel = gAnimationGroup == 'Type' ? block[0].shipData.N : block[0].shipData.G;
    //chartDataArray.push( chartData );
    //chartLabelArray.push( chartLabel );
    html = html.concat( buildBlock(block, teamIDX) );
  })
  
  //gAnimationChartData.push(chartDataArray);
  //gAnimationChartLabel.push(chartLabelArray);
  // close tags
  //html.push( '</tr>' );
  //html.push( '</table>' );
  html.push( '</td>' );
  
  return html;
  
}

function buildBlock(block, teamIDX)
{
  html = [];
  html = html.concat( buildBlockHeading(block));
  html = html.concat( buildBlockBody(block, teamIDX) );
  return html;
}

function buildBlockHeading(block)
{
  html = [];
  if(gAnimationLabel){
    var iskLost = 0;
    var blockLoss = 0;
    var offsetTime = new Date( Date.parse(gMinDateTime) + (60000*gAnimationOffset) );
    _.each(block, function(invEntry){
      var thisTime = new Date(invEntry.time.replace(/-/g,"/"));
      if(thisTime <= offsetTime){
        if(invEntry.victim){
          iskLost += invEntry.iskLost;
          blockLoss ++;
        }
      }
    });
    html.push( '<table>' );
    html.push( '<tr>' );
    var lossText = '';
    if(blockLoss>0){
      lossText = '<br>'+blockLoss+' lost, '+roundIsk(iskLost)+' Isk</td>'
    }
    if(gAnimationGroup == 'Type'){
      html.push( '<td colspan="10">'+block[0].shipData.N+' ['+block.length+']'+ lossText);
    }
    if(gAnimationGroup == 'Class'){
      html.push( '<td colspan="10">'+block[0].shipData.G+' ['+block.length+']'+ lossText );
    }
    if(gAnimationGroup == 'None'){
      html.push( '<td colspan="10">'+'All Ships'+' ['+block.length+']'+ lossText );
    }
    html.push( '</tr>' );
    html.push( '</table>' );
  }
  return html;
}

function buildBlockBody(block,teamIDX)
{
  html = [];
  html.push( '<table>' );
  html.push( '<tr>' );
  var counter = 0;
  var iconWidth = gAnimationScale ? 38 : 22;
  var calculatedWidth = Math.round( ( ($(document).width()/gCalculatedInvolved.length) - (iconWidth*2) ) /iconWidth);
  var squarewidth = Math.ceil(Math.sqrt(block.length));
  if(squarewidth < calculatedWidth ){
    calculatedWidth = squarewidth;
  }
  _.each(block, function(blockShip){
    if(counter == calculatedWidth){
         // add new row
         html.push( '</tr><tr>' );
         // reset ship icon count for this row
         counter = 0;
    }
    var id = 'p'+blockShip.index+'-'+ teamIDX;
    titleText = blockShip.playerName 
              + ' [' 
              + blockShip.corporationName 
              + '] ' 
              + blockShip.shipData.N 
              + ': ' 
              + blockShip.kills 
              + ' kills';
    html = html.concat( buildShipIcon(id, teamIDX, blockShip.shipID, titleText) );
    counter++;
  });
  html.push( '</tr>' );
  html.push( '</table>' );
  return html;
}

function buildShipIcon(id, teamIDX, shipIndex, titleText)
{
  var html = [];
  var rowClass = TEAM_COLORS[ teamIDX ] + 'Odd';
  var invIndex = id.substr(1,id.indexOf('-')-1);
  var imgClass = 'AnimIMG';
  var scale = gAnimationScale ? 32 : 16;
  html.push( '<td id="'+id+'" class="animAttacker '+rowClass+'">' );
  html.push(   '<img style = "width: '+scale+'px;"class = "'
                + imgClass
                + '" src="https://image.eveonline.com/Render/'
                + shipIndex 
                + '_32.png" title="'
                + titleText
                + '" onclick="setRIDtext('
                + teamIDX +','+invIndex
                +')"'
                
                +'>'
              );
  html.push( '</td>' );
  return html;
}

function highlightFrame( enableFlag )
{
    // Highlight attacker this frame
  _.each(gAttackersThisFrame, function(attacker){
    $( '#'+attacker ).toggleClass(TEAM_COLORS[attacker.substr(attacker.indexOf('-')+1) ]+'Odd', !enableFlag);
    $( '#'+attacker ).toggleClass('KillHighLight', enableFlag);
  });
  // Highlight died before or equal to offset time
  _.each(gDiedSoFar, function(died){
    $( '#'+died ).toggleClass(TEAM_COLORS[died.substr(died.indexOf('-')+1) ]+'Odd', !enableFlag);
    $( '#'+died ).toggleClass('KillHighLightLong', enableFlag);
  });
  // Highlight died this frame
  _.each(gDiedThisFrame, function(died){
    $( '#'+died ).toggleClass(TEAM_COLORS[died.substr(died.indexOf('-')+1) ]+'Odd', !enableFlag);
    $( '#'+died ).toggleClass('DiedHighLight', enableFlag);
  });
}

function highlightAttacker( enableFlag, attackers )
{
  // Highlight attackers
  _.each(attackers, function(attacker){
    $( '#p'+attacker[1]+'-'+ attacker[0] ).toggleClass( TEAM_COLORS[ attacker[ 0 ] ] + 'Odd', !enableFlag );
    $( '#p'+attacker[1]+'-'+ attacker[0] ).toggleClass( 'KillHighLight', enableFlag);
  });
}
function highlightAggressor( enableFlag, aggressors )
{
  // Highlight attackers
  _.each(aggressors, function(aggressor){
    $( '#p'+aggressor[3]+'-'+ aggressor[2] ).toggleClass( TEAM_COLORS[ aggressor[ 2 ] ] + 'Odd', !enableFlag );
    $( '#p'+aggressor[3]+'-'+ aggressor[2] ).toggleClass( 'DiedHighLight', enableFlag);
  });
}

function highlightShip( invIndex, teamIDX, enableFlag )
{
  $( '#p'+invIndex+'-'+ teamIDX ).toggleClass( TEAM_COLORS[ teamIDX ] + 'Odd', !enableFlag );
  $( '#p'+invIndex+'-'+ teamIDX ).toggleClass( 'KillHighLightYellow', enableFlag);
}

function preCalcInvolvedData(involved)
{
  var CHARACTER_ID = 0;
  var SHIP_ID = 1;
  var newInvolved = involved;
  _.each(newInvolved, function(team, teamIDX){
    _.each(team, function(invEntry, invIndex){
      invEntry.index = invIndex;
   });
  });
  _.each(newInvolved, function(team, teamIDX){
    _.each(team, function(invEntry, invIndex){
      if(invEntry.victim){
        var attackers = getAttackersAndShip(invEntry.killID, teamIDX, invIndex);
        _.each(attackers, function(attacker, attackerIndex){
          involved = markAttacker(attacker[CHARACTER_ID], attacker[SHIP_ID], involved, invEntry.time, invEntry.killID, teamIDX,invIndex); 
        });
        //invEntry.attackers = attackers;
        var killDetails = _.find(gData, function(kill){ return kill.killID == invEntry.killID;});
        invEntry.damage_taken = killDetails.victim.damage_taken;
        invEntry.iskLost = killDetails.zkb.totalValue;
      }
    });
  });
  return newInvolved;
}

function markAttacker(playerID, shipID, involved, killTime, killID,tIDX,iIndex)
{
  var marked = false;
  _.each(involved, function(team, teamIDX){
    if(!marked){
      // check each team for a match for this attack
      var matches= _.filter(team, function(invEntry){ return invEntry.playerID == playerID && invEntry.shipID == shipID; });
      if(matches.length>1){
        matches = _.sortBy(matches, function(invEntry){return invEntry.time;});
        _.each(matches, function(invEntry, invIndex){
          var markThis = false
          if( ( ( invEntry.time >= killTime && invEntry.victim ) || invIndex == ( matches.length-1 ) ) && !marked ){
            markThis = true;
          }
          else if(!invEntry.victim && !marked){
            markThis = true;
          }
          if(markThis){
            if(team[invEntry.index].aggressor == undefined){
              team[invEntry.index].aggressor = [];
            }
            team[invEntry.index].aggressor.push([killTime,killID,tIDX,iIndex]);
            if(involved[tIDX][iIndex].attackers == undefined){
              involved[tIDX][iIndex].attackers = [];
            }          
            involved[tIDX][iIndex].attackers.push([teamIDX, invEntry.index]);
            marked = true;
          }
        });
      }
      if(matches.length == 1){
        if(team[matches[0].index].aggressor == undefined){
          team[matches[0].index].aggressor = [];
        }
        team[matches[0].index].aggressor.push([killTime,killID,tIDX,iIndex]);
        if(involved[tIDX][iIndex].attackers == undefined){
          involved[tIDX][iIndex].attackers = [];
        }          
        involved[tIDX][iIndex].attackers.push([teamIDX, matches[0].index]);
        marked = true;
      }
      /* _.each(team, function(invEntry, invIndex){
        if(invEntry.playerID == playerID && invEntry.shipID == shipID && !marked){
          if(invEntry.aggressor == undefined){
            invEntry.aggressor = [];
          }
          invEntry.aggressor.push([killTime,killID,tIDX,iIndex]);
          if(involved[tIDX][iIndex].attackers == undefined){
            involved[tIDX][iIndex].attackers = [];
          }          
          involved[tIDX][iIndex].attackers.push([teamIDX,invIndex]);
          
          marked = true;
        }
      }); */
    }
  });
  return involved;
}

function calcFirstSeenTime(involved)
{
  _.each(involved, function(team, teamIDX){
    _.each(team, function(invEntry, invIndex){
      var firstTime = -1;
      var lastTime = -1;
      if(invEntry.aggressor != undefined){
        _.each(invEntry.aggressor, function(target){
          if(target[0] < firstTime || firstTime == -1){
            firstTime = target[0];
          }
          if(target[0] > lastTime || lastTime == -1){
            lastTime = target[0];
          }
        });
      }
      if(invEntry.victim){
        if(invEntry.time < firstTime || firstTime == -1){
          firstTime = invEntry.time;
        }
        if(invEntry.time > lastTime || lastTime == -1){
          lastTime = invEntry.time;
        }
      }
      invEntry.firstSeenTime = firstTime;
      invEntry.lastSeenTime = lastTime;
    });
  });
  return involved;
}

function timeOutTest(){
  gTimeoutFlag = true;
}

var gTimeoutFlag = false;
// Redraws replay tab
function generateAnimation( target )
{
  $( target ).append( 'Please Wait... Building Replay');
  $('#status').text( 'Please Wait... Building Replay' );
  // Get involved data
  var involved = [];
  // If teams changed read refresh flag and rebuild involved data
  if(flagInvolvedRefresh){
    setTimeout(function() {
      subCalculation(target, involved);
      $('#status').text( 'Replay Built.' );
    }, 100);
    
  }
  // Use previously calculated involved data
  else{
    involved = gCalculatedInvolved;
    subGenerateAnimation( target, involved );
    $('#status').text( 'Replay Built.' );
  }
  
}

function subCalculation(target, involved)
{
    var returnValue = buildInvolved();
    var teamLosses = returnValue.pop();
    involved = returnValue.pop();
    profile( 'preCalcInvolvedData', function( ) { involved = preCalcInvolvedData(involved); } );
    profile( 'calcFirstSeenTime',   function( ) { involved = calcFirstSeenTime(involved); } );
    gCalculatedInvolved = involved;
    flagInvolvedRefresh = false;
    subGenerateAnimation( target, involved );
}
  
function subGenerateAnimation( target, involved )
{  
  // Calculate min and max time
  var minTime = 0;
  var maxTime = 0;
  _.each(involved, function( team, teamIDX ){
    _.each( team, function( invEntry ){
      if(invEntry.victim)
        if(invEntry.time > maxTime || maxTime == 0 ){
          maxTime = invEntry.time;
        }
        if(invEntry.time < minTime || minTime == 0){
          minTime = invEntry.time;
        }
    } );
  } );
  
  minTime = minTime.replace(/-/g,"/");
  maxTime = maxTime.replace(/-/g,"/");
  
  gMaxDateTime = new Date(maxTime);
  gMinDateTime = new Date(minTime);
  var timeSpan = (gMaxDateTime - gMinDateTime)/1000/60;
  
  // Begin replay page build
  var html = [];
  // Info text
  html.push('Start: '+ minTime + ' End: ' + maxTime + ' Duration:'+ timeSpan + ' mins');
  
  // Options
  html.push(' | Group by: ');
  html.push( '<select class="animButtons ui-state-default" id="ux-animationGroupBy" onchange="setAnimationGroup()">');
  html.push( '<option '+ (gAnimationGroup == 'Type'  ? 'selected' : '') +'>Type</option>');
  html.push( '<option '+ (gAnimationGroup == 'Class' ? 'selected' : '') +'>Class</option>');
  html.push( '<option '+ (gAnimationGroup == 'None' ? 'selected' : '') +'>None</option>');
  html.push( '</select>');
  
  /* html.push('  Width: ');
  html.push( '<select class="animButtons ui-state-default" id="ux-animationWidth" onchange="setAnimationWidth()">');
  html.push( '<option '+ (gAnimationWidth == 5  ? 'selected' : '') +'>5</option>');
  html.push( '<option '+ (gAnimationWidth == 10 ? 'selected' : '') +'>10</option>');
  html.push( '<option '+ (gAnimationWidth == 15 ? 'selected' : '') +'>15</option>');
  html.push( '<option '+ (gAnimationWidth == 20 ? 'selected' : '') +'>20</option>');
  html.push( '<option '+ (gAnimationWidth == 25 ? 'selected' : '') +'>25</option>');
  html.push( '<option '+ (gAnimationWidth == 30 ? 'selected' : '') +'>30</option>');
  html.push( '<option '+ (gAnimationWidth == 40 ? 'selected' : '') +'>40</option>');
  html.push( '</select>'); */
  
  html.push('  Filter: ');
  html.push( '<select class="animButtons ui-state-default" id="ux-animationFilter" onchange="setAnimationFilter()">');
  html.push( '<option '+ (gShowKillsOnly ? 'selected' : '')  +'>Kills</option>');
  html.push( '<option '+ (!gShowKillsOnly ? 'selected' : '') +'>All</option>');
  html.push( '</select>');
  
  html.push('  Speed: ');
  html.push( '<select class="animButtons ui-state-default" id="ux-animationSpeed" onchange="setAnimationSpeed()">');
  html.push( '<option '+ (gAnimationSpeed == 1  ? 'selected' : '')  +'>1</option>');
  html.push( '<option '+ (gAnimationSpeed == 5  ? 'selected' : '')  +'>5</option>');
  html.push( '<option '+ (gAnimationSpeed == 10 ? 'selected' : '')  +'>10</option>');
  html.push( '</select>');
  
  html.push('  Show Labels: ');
  html.push( '<select class="animButtons ui-state-default" id="ux-animationLabel" onchange="setAnimationLabel()">');
  html.push( '<option '+ (gAnimationLabel  ? 'selected' : '')  +'>On</option>');
  html.push( '<option '+ (!gAnimationLabel ? 'selected' : '')  +'>Off</option>');
  html.push( '</select>');
  
  html.push('  Sort: ');
  html.push( '<select class="animButtons ui-state-default" id="ux-animationSort" onchange="setAnimationSort()">');
  html.push( '<option '+ (gAnimationSort  ? 'selected' : '')  +'>Size</option>');
  html.push( '<option '+ (!gAnimationSort ? 'selected' : '')  +'>Value</option>');
  html.push( '</select>');
  
  html.push('  Scale: ');
  html.push( '<select class="animButtons ui-state-default" id="ux-animationScale" onchange="setAnimationScale()">');
  html.push( '<option '+ (gAnimationScale  ? 'selected' : '')  +'>100%</option>');
  html.push( '<option '+ (!gAnimationScale ? 'selected' : '')  +'>50%</option>');
  html.push( '</select>');
  
  html.push('<br>');
  
  // Replay controls
  html.push('<table>');
  html.push('<tr>');
  html.push('<td>');
  html.push('<button id="playButton" class="animButtons">></button>');
  html.push('<button id="pauseButton" class="animButtons">||</button>');
  html.push('<button id="startButton" class="animButtons">|<</button>');
  html.push('<button id="backButton" class="animButtons"><<</button>');
  html.push('<button id="forwardButton" class="animButtons">>></button>');
  html.push('<button id="endButton" class="animButtons">>|</button>');
  html.push('<td>');
  html.push('<div id="progressbar" class="animationbar"></div>');
  html.push('</td>');
  html.push('<td> : ');
  html.push('<input id="offsetInput" class="ui-state-default ux-offset animButtons" value="'+gAnimationOffset+'" type="number" min="0" max="'+timeSpan+'"" readonly>');
  html.push(' mins');
  html.push('</td>');
  html.push('</tr>');
  html.push('</table>');
  
  // Help text
  html.push('To use this replay, hit the play button above, adjust the time manually, and adjust the filters, speed and layout');
  html.push('<div id="mainTreeDiv"></div>');
  html = html.concat( buildInfoDiv() );
  // Initialise vars
  var attackersThisFrame = [];
  var attackersSoFar = [];
  var diedSoFar = [];
  var diedThisFrame = [];
  var iskLostTeam = [];  
  
  html = html.concat( buildMainWindow(involved) );
  
  //
  //oldFunction();
  
  // write generated html to the replay tab
  $( target ).empty();
  $( target ).append( html.join( '' ));
  
  // calculate offset times
  
  var offsetTime = new Date( Date.parse(gMinDateTime) + (60000*gAnimationOffset) );
  
  _.each(involved, function(team, teamIdx){
    var iskLost = 0;
    _.each(team, function(invEntry, invIndex){
      if (invEntry.victim){
        var thisTime = new Date(invEntry.time.replace(/-/g,"/"));
        if(thisTime <= offsetTime){
          diedSoFar.push('p'+invIndex+'-'+teamIdx);
          if(offsetTime-thisTime < (60000*gAnimationSpeed)){
            diedThisFrame.push('p'+invIndex+'-'+teamIdx);
          }
          // add isk lost to iskLost total
          iskLost += invEntry.iskLost;
        }
      }
      if(invEntry.aggressor!=undefined){
        var addedFlag = false;
        _.each(invEntry.aggressor, function(aggro){
          var thisTime = new Date(aggro[0].replace(/-/g,"/"));
          if(thisTime<=offsetTime && !addedFlag){
            if(offsetTime-thisTime < (60000*gAnimationSpeed)){
              attackersThisFrame.push('p'+invIndex+'-'+teamIdx);
              addedFlag = true;
            }
            attackersSoFar.push('p'+invIndex+'-'+teamIdx);
            
          }
        });
      }
      
    });
    iskLostTeam.push(iskLost);    
  });
  
  
    
  // remove duplicate entries
  attackersThisFrame = _.uniq(attackersThisFrame);
  attackersSoFar = _.uniq(attackersSoFar);
  diedSoFar = _.uniq(diedSoFar);
  diedThisFrame = _.uniq(diedThisFrame);
  
  gAttackersThisFrame = attackersThisFrame;
  gAttackersSoFar = attackersSoFar;
  gDiedSoFar = diedSoFar;
  gDiedThisFrame = diedThisFrame;
  
  
  // Highlight the stuff for this frame
  highlightFrame( true );

  
  
  // calculate isklost values
  var totalIskLost = 0;
  _.each( involved, function( team, teamIdx ){
    totalIskLost += iskLostTeam[teamIdx];
  } );
  
  // write isklost onto header
  _.each( involved, function( team, teamIdx ){
    var efficiency = 100;
    if(iskLostTeam[teamIdx]>0){
      efficiency = Math.round10(100-((iskLostTeam[teamIdx]/totalIskLost)*100), -1);
    }
    $( '#team'+teamIdx+'isk' ).empty();
    $( '#team'+teamIdx+'isk' ).append(roundIsk(iskLostTeam[teamIdx])+' Isk Lost, Efficiency: '+ efficiency +'%');
  } );
  
  // Treemap code
  var boxFormatter = function (coordinates, index) {
            // so in this case an index of [1,1] would refer to "London" and [2,1] to "Berlin"
            // coordinates are in the form [x1,y1,x2,y2]
            var teamIdx = index[0];
            var color = 'white';
            if(teamIdx == 0){
              color = 'blue';
            }if(teamIdx == 1){
              color = 'red';
            }if(teamIdx == 2){
              color = 'green';
            }if(teamIdx == 3){
              color = 'purple';
            }
            return{ "fill" : color };
        };
  
  /* if(gAnimationChartData.length > 0 && involved != undefined){
    var emptyChartData = false;
    for(var i=0;i<involved.length;i++){
      var treemapDiv = 'team'+ i +'chart';
      if(gAnimationChartData[i].length >0){
        Treemap.draw( treemapDiv, 300, 200, gAnimationChartData[i], gAnimationChartLabel[i], {'box': { 'fill' : TEAM_COLORS_LOWER_CASE[i]}});
      }
      else{
        emptyChartData = true;
      }
    }
    if(!emptyChartData){
      Treemap.draw( 'mainTreeDiv' ,800,300, gAnimationChartData, gAnimationChartLabel, { 'box' : boxFormatter});
    }
  } */
  gAnimationChartData = [];
  gAnimationChartLabel = [];
  
  // Set progress bar
  $( "#progressbar" ).slider({
      min: 0,
      max: timeSpan,
      range: "min",
      value: gAnimationOffset,
      stop: function( event, ui ) {
        //console.log(ui.value);
        gAnimationOffset = ui.value;
        refresh();
        //$( "#offsetInput" ).value(ui.value);
      },
      slide: function( event, ui ) {
        //console.log(ui.value);
        gAnimationOffset = ui.value;
        //refresh();
        $( "#offsetInput" ).val(ui.value);
      }
    } 
  );
  
  $('#replayInfoDiv').hide();

  // Set buttons
  $( "#playButton" )
    .button()
    .click(function( ) {
      playOffset(timeSpan);
    });
  $( "#pauseButton" )
    .button()
    .click(function( ) {
      pauseOffset();
    });
  $( "#startButton" )
    .button()
    .click(function( ) {
      startOffset();
    });
  $( "#endButton" )
    .button()
    .click(function( ) {
      endOffset(timeSpan);
    });
  $( "#backButton" )
    .button()
    .click(function( ) {
      reduceOffset();
    });
  $( "#forwardButton" )
    .button()
    .click(function( ) {
      addOffset(timeSpan);
    });
}

function generateInvolved( target )
{
  var width = Math.round( 100 / gTeams.length );
  
  var returnValue = buildInvolved();
  var teamLosses = returnValue.pop();
  var involved  = returnValue.pop();
    
  var html = [];
  html.push( '<table class="view-involved"><tr class="view-involved">' );
  var totalLosses = returnValue.pop();

  profile( 'involved-htmlOutput', function( ) {
    _.each( involved, function( team, teamIdx )
    {
      var oddRow = true;
      html.push( '<td class="view-involved" width=' + width + '%>' );
      html.push( '  <table class="view-involvedDetail ui-widget-content">' );
      html.push( '    <thead class="view-involvedHeader">' );
      html.push( '      <th colspan=2>Pilot/Ship</td>' );
      html.push( '      <th>Corp/Alliance</td>' );
      html.push( '    </thead>' );
      _.each( team, function( invEntry )
      {
        var rowClass = TEAM_COLORS[ teamIdx ] + ( invEntry.victim ? 'Kill' : oddRow ? 'Odd' : 'Even' );
        var rowData = generateKillMailCell( '', invEntry, totalLosses - teamLosses[ teamIdx ] );
        html.push( TableRow( rowClass, rowData ));
        oddRow = !oddRow;
      } );
      html.push( '  </table>' );
      html.push( '</td>' );
    } );
    html.push( '</tr></table>' );
  } );
  var node = document.getElementById( 'involvedTable' );
  profile( 'involved-empty', function( )
  {
//    node.innerHTML = null;
//    node.parentNode.replaceChild( node.cloneNode( false ), node );
    var node = document.getElementById( 'involvedTable' );
    while( node.hasChildNodes( ))
    {
      node.removeChild( node.lastChild );
    }
  } );
//  profile( 'involved-empty',    function( ) { $( target ).empty( ); } );
  profile( 'involved-append',   function( ) { $( target ).append( html.join( '' )); } );
//  profile( 'involved-html', function( ) { $( target ).html( html ); } );
}

function generateKillMailCell( cellClass, invEntry, nonTeamLosses )
{
  var imageLink      = eveImageLink( 'Render', invEntry.shipData.I );
  var leftUpperCell  = zKillLink( 'character', invEntry.playerID, invEntry.playerName ) + ' ' + ( invEntry.podKillID == 0 ? '' : zKillLink( 'detail', invEntry.podKillID, '[Pod]' ));
  var leftLowerCell  = invEntry.shipData.N;
  var rightUpperCell = zKillLink( 'corporation', invEntry.corporationID, invEntry.corporationName );
  var rightLowerCell = zKillLink( 'alliance', invEntry.allianceID, invEntry.allianceName );

  var cellData   = TableData( 'view-involvedIcon ' + cellClass, invEntry.victim ? zKillLink( 'kill', invEntry.killID, imageLink ) : imageLink );
  cellData      += TableData( 'teamText ' + cellClass, Bold( leftUpperCell )  + '<br>' + leftLowerCell );
  if ( nonTeamLosses != undefined )
  {
    assert(( nonTeamLosses != 0 ) || ( invEntry.kills != 0 ));
    var percentage = ( nonTeamLosses == 0 ? 0 : Math.round( invEntry.kills / nonTeamLosses * 1000 ) / 10 );
    cellData    += TableData( 'teamText ' + cellClass + ' view-rightAlign' , 'N� ' + invEntry.kills + '<br>' + percentage.toFixed( 1 ) + '%' );
  }
  cellData      += TableData( 'teamText ' + cellClass, Bold( rightUpperCell ) + '<br>' + rightLowerCell );
  return cellData;
}

function generateBattleTimeline( target )
{
  var involved = [];
  _.each( gTeams, function( )
  {
    involved.push( [] );
  } );

  gData.sort( function( lhs, rhs )
  {
      // sort predicate:  if the killtimes are equal then put the pod after the
      //                  ship in the kill list
    if ( lhs.killTime == rhs.killTime )
    {
      return isCapsule( lhs.victim.shipTypeID ) - isCapsule( rhs.victim.shipTypeID );
    }
    return lhs.killTime > rhs.killTime ? 1 : -1;
  } );

  var html = [];
  html.push( '<div><table class="view-timeline ui-widget-content"><thead><th align="center">Time</th>' );
  var lastTime = '';
  var blockHtml = '';
  var oddRow = true;
  var dataByTime = _.groupBy( gData, 'killTime' );
  for( var teamIdx = 0; teamIdx < gTeams.length; ++teamIdx )
  {
    html.push( '<th colspan=2 align="center">Pilot/Ship</th><th align="center">Alliance/Corp</th>' );
  }
  html.push( '</thead>' );
  _.each( dataByTime, function( event )
  {
    assert( event[ 0 ] != undefined );
    assert( event[ 0 ].killTime != undefined );
    // extract time portion of the killTime and remove the seconds portion
    var timeHeader = event[ 0 ].killTime.split( ' ' )[ 1 ].slice( 0, - 3 );
    var timeTitle = timeHeader;
    var timeRowClass = 'view-timelineTimeRow';
    var dataByTeam = _.groupBy( event, function( entry ) { return getTeam( entry.victim.allianceID == 0 ? entry.victim.corporationID : entry.victim.allianceID ); } );
    var index = 0;
    var found = true;
    while( found )
    {
      found = false;
      var htmlBlock = [];
      htmlBlock.push( '<td class="' + timeRowClass + '" + title="' + timeTitle + '">' + timeHeader + '</td>' );
      for( var teamIdx = 0; teamIdx < gTeams.length; ++teamIdx )
      {
        var teamRecord = _.toArray( dataByTeam[ teamIdx ] );
        var cellClass = TEAM_COLORS[ teamIdx ] + ( oddRow ? 'Odd' : 'Even' );
        var cellData = '<td class="' + timeRowClass + '" colspan=3 style="width: '+(100/gTeams.length)+'%;"></td>';
        if ( index < teamRecord.length )
        {
          var data = teamRecord[ index ];
          found = true;
          var invEntry = initInvolvedEntry( data.victim );
          invEntry.playerName = data.victim.characterName;
          invEntry.playerID = data.victim.characterID;
          invEntry.killID = data.killID;
          invEntry.victim = true;
          invEntry.podKillID = 0;
          invEntry.shipData = _.find( gShipTypes, function( X ) { return X.I == data.victim.shipTypeID; } );
          if ( invEntry.shipData == undefined )
          {
            invEntry.shipData = _.find( gShipTypes, function( X ) { return X.I == 0; } );
          }
          cellData = generateKillMailCell( timeRowClass + ' ' + cellClass, invEntry, undefined );
        }
        htmlBlock.push( cellData );
      }
      if ( found )
      {
        oddRow = !oddRow;
        html.push( TableRow( 'view-timelineRow', htmlBlock.join( '' )));
        timeRowClass = '';
        timeHeader = '';
      }
      ++index;
    }
  } );
  html.push( '</table></div>' );
  $( target ).empty( );
  $( target ).append( html.join( '' ));
}

function oldFunction()
  {
  // main window
  html.push( '<table class="view-involved"><tr class="view-involved">' );
  // For each team
  _.each( involved, function( team, teamIdx )
  {
    // init vars
    var iskLost = 0;
    var counter = 0;
    var lastType = 0;
    var lastClass = '';
    
    // Start team window
    html.push( '<td>' );
    html.push( '<table>' );
     // Isk header
    html.push( '<tr>' );
    html.push( '<div class="animIsk" id="team'+ teamIdx +'isk"></div>' );
    html.push( '</tr>' );
    // block start
    html.push( '<tr>' );
    // For each ship icon in team
    _.each( team, function( invEntry, invIndex )
    {
      var id = 'p'+invIndex+'-'+teamIdx;
      // Block label
      if(gAnimationLabel && !gShowKillsOnly){
        if(lastType == 0 && gAnimationGroup == 'Type'){
          html.push( '<td colspan="10">'+invEntry.shipData.N+'</td></tr><tr>' );
        }
        if(lastClass == '' && gAnimationGroup == 'Class'){
          html.push( '<td colspan="10">'+getShipClass(invEntry.shipData.I)+'</td></tr><tr>' );
        }
      }
      
      // If grouping by type, and this type is different from the last type
      if(lastType != invEntry.shipData.O && lastType != 0 && gAnimationGroup == 'Type'){
         // if labels on and kills filter off
         if(gAnimationLabel&& !gShowKillsOnly){
           // add type label and add new row
           html.push( '</tr><tr><td colspan="10">'+invEntry.shipData.N+'</td></tr><tr>' );
         }
         else{
           // add new row
           html.push( '</tr><tr>' );
         }
         // reset ship icon count for this row
         counter = 0;
      }
      
      // If grouping by class, and this class is different from the last class 
      if(lastClass != getShipClass(invEntry.shipData.I) && lastClass != '' && gAnimationGroup == 'Class'){
         // if labels on and kills filter off
         if(gAnimationLabel && !gShowKillsOnly){
           // add class label and add new row
           html.push( '</tr><tr><td colspan="10">'+getShipClass(invEntry.shipData.I)+'</td></tr><tr>' );
         }
         else{
           // add new row
           html.push( '</tr><tr>' );
         }
         // reset ship icon count for this row
         counter = 0;
      }
      
      // If row of icons is bigger than width then add new row
      if(counter > gAnimationWidth-1){
         // add new row
         html.push( '</tr><tr>' );
         // reset ship icon count for this row
         counter = 0;
      }
      
      // calculate offset times
      var thisTime = new Date(invEntry.time);
      var offsetTime = new Date( Date.parse(minDateTime) + (60000*gAnimationOffset) );
      // generate title text for ship icon
      var titleText = invEntry.playerName + ' [' + invEntry.corporationName + '] ' + invEntry.shipData.N + ': ' + invEntry.kills + ' kills';
      
      // if this ship icon is a victim
      if(invEntry.victim){
        // find the kill in gData
        var killDetails = _.find(gData, function(kill){ return kill.killID == invEntry.killID;});
        // if thistime is before or equal to offset time
        if (thisTime <= offsetTime){
           // add isk lost to iskLost total
          iskLost += killDetails.zkb.totalValue;
          // add index to diedSoFar array
          diedSoFar.push('p'+invIndex+'-'+teamIdx);

          // For each attacker on this kill
          _.each(invEntry.attackers, function(attacker){
            // add to attackersSoFar array
            attackersSoFar.push(attacker[0]);
            // If difference between thistime and offset is less than 60 seconds, multiplied by the animation speed
            if(offsetTime-thisTime < (60000*gAnimationSpeed)){
              // add to attackersThisFrame array
              attackersThisFrame.push(attacker[0]);
            }
          });
        }
         // if thistime is before or equal to offset time and kills filter is off
        if(thisTime <= offsetTime || !gShowKillsOnly){
          // build ship icon html
          html = html.concat( buildShipIcon(id, teamIdx, invEntry.shipData.I, titleText) );
          // increment ship icon count for this row
          counter++;
        }
      }
      // if this ship icon is NOT a victim and kills filter is off
      else if(!gShowKillsOnly){
        // build ship icon html
        html = html.concat( buildShipIcon(id, teamIdx, invEntry.shipData.I, titleText) );
        // increment ship icon count for this row
        counter++;
      }
      // store the type and class of this ship icon
      lastType = invEntry.shipData.O;
      lastClass = getShipClass(invEntry.shipData.I);
   
    });
    // end of each ship icon loop
    
    // close tags
    html.push( '</tr>' );
    html.push( '  </table>' );
    html.push( '</td>' );
    // add iskLost to iskLostTeam array
    iskLostTeam.push(iskLost);
  });
  // End of team loop
  // close tags
  html.push( '</tr></table>' );
  
}

