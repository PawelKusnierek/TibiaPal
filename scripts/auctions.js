function submit_form() {
    server = document.getElementById("server")
    var city_array = ["Ab'Dendriel", "Ankrahmun", "Carlin", "Darashia", "Edron", "Issavi", "Kazordoon", "Liberty Bay", "Port Hope", "Rathleton", "Svargrond", "Thais", "Venore", "Yalahar"];

    var table_content = document.getElementById("auction_table_container");
    var tableRef = document.getElementById('houses-table').getElementsByTagName('tbody')[0];
    document.getElementById('houses-table').style.display = "initial";

    for (var i = 0; i < city_array.length; i++) {
        let url = 'https://api.tibiadata.com/v2/houses/' + server.value + '/' + city_array[i] + '.json'
        fetch(url)
            .then(response => response.json())
            .then((out) => {
                for (var j = 0; j < out.houses.houses.length; j++) {
                    let house_details = out.houses.houses[j]
                    if (house_details.status.includes('auctioned')) {
                        city = out.houses.town
                        house_id = house_details.houseid
                        name = house_details.name
                        rent = house_details.rent
                        size = house_details.size

                        var newRow = tableRef.insertRow();
                        var thirdCell = newRow.insertCell(0);
                        var thirdCellText = document.createTextNode(size);
                        thirdCell.appendChild(thirdCellText);
                        var secondCell = newRow.insertCell(0);
                        var secondCellText = document.createTextNode(name);
                        secondCell.appendChild(secondCellText);
                        var firstCell = newRow.insertCell(0);
                        var firstCellText = document.createTextNode(city);
                        firstCell.appendChild(firstCellText);
                        var zeroCell = newRow.insertCell(0);
                        var ZeroCellText = document.createTextNode(server.value);
                        zeroCell.appendChild(ZeroCellText);
                    }
                }
            })
    }
}
