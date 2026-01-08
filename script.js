function checkAntwoord() {
    let antwoord = document.getElementById("antwoord").value.toLowerCase();
    let feedback = document.getElementById("feedback");

    if (antwoord === "rivier") {
        feedback.innerHTML = "Goed zo! 🎉 <br><a href='opdracht2.html'>Ga naar de volgende QR</a>";
    } else {
        feedback.innerHTML = "Dat is niet goed, probeer opnieuw!";
    }
}

