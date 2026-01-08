function checkAntwoord() {
    let antwoord = document.getElementById("antwoord").value.toLowerCase();
    let feedback = document.getElementById("feedback");

    if (antwoord === "rivier") {
        feedback.innerHTML = "Goed zo! 🎉";
    } else {
        feedback.innerHTML = "Dat is niet goed, probeer opnieuw!";
    }
}

