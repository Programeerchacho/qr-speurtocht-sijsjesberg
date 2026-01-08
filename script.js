function checkAntwoord() {
    let antwoord = document.getElementById("antwoord").value.toLowerCase();
    let feedback = document.getElementById("feedback");

    if (antwoord === "rivier") {
        feedback.innerHTML = "Goed zo! 🎉 De volgende QR is op deze locatie te vinden:";
    } else {
        feedback.innerHTML = "Dat is niet goed, probeer opnieuw!";
    }
}

