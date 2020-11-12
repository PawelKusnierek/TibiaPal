function submit_form() {
    server = document.getElementById("server")

    var city_array = ["Ab'Dendriel", "Ankrahmun", "Carlin", "Darashia", "Edron", "Issavi", "Kazordoon", "Liberty Bay", "Port Hope", "Rathleton", "Svargrond", "Thais", "Venore", "Yalahar"];
    let url = 'https://api.tibiadata.com/v2/houses/Antica.json'

    for (var i = 0; i < city_array.length; i++) {
        let url = 'https://api.tibiadata.com/v2/houses/' + server.value + '/' + city_array[i] + '.json'
        fetch(url)
            .then(res => res.json())
            .then((out) => {
                for (var j = 0; j < out.houses.houses.length; j++) {
                    let house_details = out.houses.houses[j]
                    if (house_details.status.includes('auctioned')) {
                        house_id = house_details.houseid
                        name = house_details.name
                        rent = house_details.rent
                        size = house_details.size
                        status = house_details.status
                    }
                }
            })
        fetch('https://api.tibiadata.com/v2/houses/' + server.value + '/' + house_id + '.json')
            .then(res2 => res2.json())
            .then((out2) => {
                rent = house_details.rent
            })
    }
}

