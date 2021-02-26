function find_stream_status() {
    stream_content = document.getElementById("stream-content")

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.twitch.tv/helix/streams/kusnierr", true);
    xhr.setRequestHeader("Client-ID", "qqiafa1gpappsi6jz2yq056ajcuxnu");
    var data = JSON.parse(xhr.responseText);
    var a = 1;
}