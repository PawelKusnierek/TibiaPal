function submit_form() {
    server = document.getElementById("server")
    button = document.getElementById("submitbutton")
    button.disabled = true

    var auction_content = document.getElementById("auction_container");
    auction_content.innerHTML = "";


    var city_array = ["Ab'Dendriel", "Ankrahmun", "Carlin", "Darashia", "Edron", "Issavi", "Kazordoon", "Liberty Bay", "Port Hope", "Rathleton", "Svargrond", "Thais", "Venore", "Yalahar"];
    auctioned_houses = {}

    findAuctionedHouses(server.value, city_array, auctioned_houses)
        .then(auctioned_houses => {
            fetchAuctionedHousesData(server.value, auctioned_houses)
                .then(auctioned_houses_with_details => {
                    for (var i = 0; i < Object.keys(auctioned_houses_with_details).length; i++) {
                        updateHTMLWithHouseDetails(auctioned_houses_with_details, i)
                    }
                })
        })
}

async function findAuctionedHouses(server, city_array, auctioned_houses) {
    for (var i = 0; i < city_array.length; i++) {
        let url = 'https://api.tibiadata.com/v2/houses/' + server + '/' + city_array[i] + '.json'
        const response = await fetch(url);
        const response_json = await response.json();
        for (var j = 0; j < response_json.houses.houses.length; j++) {
            let house_details = response_json.houses.houses[j]
            if (house_details.status.includes('auctioned')) {

                house_id = house_details.houseid
                city = response_json.houses.town
                name = house_details.name
                rent = house_details.rent
                size = house_details.size

                house_dict_details = {}
                house_dict_details["city"] = city
                house_dict_details["name"] = name
                house_dict_details["rent"] = rent
                house_dict_details["size"] = size

                auctioned_houses[house_id] = house_dict_details
            }
        }
    }
    return auctioned_houses
}

async function fetchAuctionedHousesData(server, auctioned_houses_with_details) {
    for (var i = 0; i < Object.keys(auctioned_houses_with_details).length; i++) {
        let house_id = Object.keys(auctioned_houses_with_details)[i]
        let url = 'https://api.tibiadata.com/v2/house/' + server + '/' + house_id + '.json'
        const response = await fetch(url);
        const response_json = await response.json();
        let specific_house_details = response_json.house
        auctioned_houses_with_details[house_id]["beds"] = specific_house_details.beds
        auctioned_houses_with_details[house_id]["img"] = specific_house_details.img
        if (specific_house_details.status.auction_end !== null) {
            auctioned_houses_with_details[house_id]["current_bid"] = specific_house_details.status.current_bid
            auctioned_houses_with_details[house_id]["auction_end"] = specific_house_details.status.auction_end.date.substring(0, 10)
        } else {
            auctioned_houses_with_details[house_id]["current_bid"] = "Not auctioned"
            auctioned_houses_with_details[house_id]["auction_end"] = "Not auctioned"
        }
    }

    return auctioned_houses_with_details
}

function updateHTMLWithHouseDetails(auctioned_houses_with_details, i) {
    let house_id = Object.keys(auctioned_houses_with_details)[i]
    img = auctioned_houses_with_details[house_id]["img"]
    city = auctioned_houses_with_details[house_id]["city"]
    name = auctioned_houses_with_details[house_id]["name"]
    size = auctioned_houses_with_details[house_id]["size"] + " sqm"
    beds = auctioned_houses_with_details[house_id]["beds"]
    rent = auctioned_houses_with_details[house_id]["rent"]
    rent = rent / 1000 + "k"
    bid = auctioned_houses_with_details[house_id]["current_bid"]
    if (bid > 1000000) {
        bid = (bid / 1000000).toFixed(1) + "kk"
    } else if (bid > 1000) {
        bid = (bid / 1000).toFixed(1) + "k"
    } else if (bid !== "Not auctioned") {
        bid = bid + " gp"
    }
    end = auctioned_houses_with_details[house_id]["auction_end"]

    var auction_content = document.getElementById("auction_container");

    var house_container = document.createElement('div');
    house_container.id = house_id;
    house_container.className = 'house_container';

    var house_img = document.createElement('div');
    house_img.className = 'house_img'
    var img_element = document.createElement("img");
    img_element.src = img
    img_element.setAttribute("height", "200");
    img_element.setAttribute("width", "200");
    img_element.setAttribute("alt", "Image of house");
    house_img.appendChild(img_element)

    var house_details = document.createElement('div');
    house_details.className = 'house_details';
    var tbl = document.createElement('table');
    tbl.className = 'house_details_table'
    var tbdy = document.createElement('tbody');

    var firstRow = tbdy.insertRow();
    var firstRowSecondCell = firstRow.insertCell(0);
    var firstRowSecondCellText = document.createTextNode(city);
    var firstRowFirstCell = firstRow.insertCell(0);
    var firstRowFirstCellText = document.createTextNode("City");
    firstRowSecondCell.appendChild(firstRowSecondCellText);
    firstRowFirstCell.appendChild(firstRowFirstCellText);
    firstRowSecondCell.style.width = '150px'

    var secondRow = tbdy.insertRow();
    var secondRowSecondCell = secondRow.insertCell(0);
    var secondRowSecondCellText = document.createTextNode(name);
    var secondRowFirstCell = secondRow.insertCell(0);
    var secondRowFirstCellText = document.createTextNode("Name");
    secondRowSecondCell.appendChild(secondRowSecondCellText);
    secondRowFirstCell.appendChild(secondRowFirstCellText);

    var thirdRow = tbdy.insertRow();
    var thirdRowSecondCell = thirdRow.insertCell(0);
    var thirdRowSecondCellText = document.createTextNode(size);
    var thirdRowFirstCell = thirdRow.insertCell(0);
    var thirdRowFirstCellText = document.createTextNode("Size");
    thirdRowSecondCell.appendChild(thirdRowSecondCellText);
    thirdRowFirstCell.appendChild(thirdRowFirstCellText);

    var fourthRow = tbdy.insertRow();
    var fourthRowSecondCell = fourthRow.insertCell(0);
    var fourthRowSecondCellText = document.createTextNode(beds);
    var fourthRowFirstCell = fourthRow.insertCell(0);
    var fourthRowFirstCellText = document.createTextNode("Beds");
    fourthRowSecondCell.appendChild(fourthRowSecondCellText);
    fourthRowFirstCell.appendChild(fourthRowFirstCellText);

    var fifthRow = tbdy.insertRow();
    var fifthRowSecondCell = fifthRow.insertCell(0);
    var fifthRowSecondCellText = document.createTextNode(rent);
    var fifthRowFirstCell = fifthRow.insertCell(0);
    var fifthRowFirstCellText = document.createTextNode("Rent");
    fifthRowSecondCell.appendChild(fifthRowSecondCellText);
    fifthRowFirstCell.appendChild(fifthRowFirstCellText);

    var sixthRow = tbdy.insertRow();
    var sixthRowSecondCell = sixthRow.insertCell(0);
    var sixthRowSecondCellText = document.createTextNode(bid);
    var sixthRowFirstCell = sixthRow.insertCell(0);
    var sixthRowFirstCellText = document.createTextNode("Bid");
    sixthRowSecondCell.appendChild(sixthRowSecondCellText);
    sixthRowFirstCell.appendChild(sixthRowFirstCellText);

    var seventhRow = tbdy.insertRow();
    var seventhRowSecondCell = seventhRow.insertCell(0);
    var seventhRowSecondCellText = document.createTextNode(end);
    var seventhRowFirstCell = seventhRow.insertCell(0);
    var seventhRowFirstCellText = document.createTextNode("End");
    seventhRowSecondCell.appendChild(seventhRowSecondCellText);
    seventhRowFirstCell.appendChild(seventhRowFirstCellText);

    tbl.appendChild(tbdy)

    house_details.appendChild(tbl)

    house_container.appendChild(house_img)
    house_container.appendChild(house_details)

    auction_content.appendChild(house_container)

    button = document.getElementById("submitbutton")
    button.disabled = false
}