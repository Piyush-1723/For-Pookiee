// app.js

// Function to calculate the accurate date difference
function updateCountdown() {
    const targetDate = new Date("October 24, 2024"); // Set the target date
    const currentDate = new Date(); // Get the current date

    // Calculate the difference in years, months, and days
    let years = currentDate.getFullYear() - targetDate.getFullYear();
    let months = currentDate.getMonth() - targetDate.getMonth();
    let days = currentDate.getDate() - targetDate.getDate();

    // Adjust months and years if the month difference is negative
    if (months < 0) {
        months += 12;
        years -= 1;
    }

    // Adjust days if the day difference is negative (borrow from the previous month)
    if (days < 0) {
        const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0); // Get the last day of the previous month
        days += prevMonth.getDate(); // Add the number of days in the previous month
        months -= 1;

        // Adjust months and years if months becomes negative
        if (months < 0) {
            months += 12;
            years -= 1;
        }
    }

    // Update the HTML elements with the calculated values
    document.getElementById("years").textContent = years;
    document.getElementById("months").textContent = months;
    document.getElementById("days").textContent = days;
}

// Call the function to initialize the countdown
updateCountdown();

// Optionally, you can call the updateCountdown function at an interval to keep it updated
// setInterval(updateCountdown, 1000); // Uncomment to update every second (not recommended for this case)
