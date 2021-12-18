// import axios from "axios";

let host: HTMLInputElement = document.getElementById("host") as HTMLInputElement;
let port: HTMLInputElement = document.getElementById("port") as HTMLInputElement;
let eci: HTMLInputElement = document.getElementById("eci") as HTMLInputElement;
let eid: HTMLInputElement = document.getElementById("eid") as HTMLInputElement;
let domain: HTMLInputElement = document.getElementById("domain") as HTMLInputElement;
let e_type_name: HTMLInputElement = document.getElementById("type_name") as HTMLInputElement;
let preview: HTMLInputElement = document.getElementById("url_preview") as HTMLInputElement;

let button: HTMLButtonElement = document.getElementById("send_button") as HTMLButtonElement;

let results = document.getElementById("results");

let url: string = "";

button.addEventListener("click", async () => {
   // @ts-ignore
    let res = await axios.post(url, null);

    results.innerText = '\n' + JSON.stringify(res.data, null, 2);
});

function update() {
    if (!eid.value) eid.value = "none";

    url = `http://${host.value}:${port.value}/sky/event/${eci.value}/${eid.value}/${domain.value}/${e_type_name.value}`
    preview.innerText = url;
}

update();

let inputs: HTMLInputElement[] = [host, port, eci, eid, domain, e_type_name];

for (let el of inputs) {
    el.addEventListener("keyup", () => {
        console.log("changed");
        window.requestAnimationFrame(update);
    });
}
