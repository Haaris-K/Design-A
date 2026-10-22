/* ==========================================================================
   MID-FIDELITY PROTOTYPE SCRIPT
   - Simple, student-friendly vanilla JavaScript
   - Handles multi-step navigation, local JSON filler data, and seat selection
   ========================================================================== */

// --- Default Filler Data (Fallback for direct file:// browser viewing) ---
const fallbackData = {
  cinemas: [
    "Downtown Cinema",
    "West End Cineplex",
    "Northside Plaza"
  ],
  dates: [
    "Today, Oct 8",
    "Tomorrow, Oct 9",
    "Friday, Oct 10"
  ],
  movies: [
    {
      id: "m1",
      title: "The Silent Horizon",
      genre: "Sci-Fi / Adventure",
      duration: "142 min",
      rating: "PG-13",
      showtimes: ["1:30 PM", "4:15 PM", "7:00 PM", "9:45 PM"]
    },
    {
      id: "m2",
      title: "City Lights & Shadows",
      genre: "Mystery / Drama",
      duration: "118 min",
      rating: "R",
      showtimes: ["2:00 PM", "5:30 PM", "8:15 PM"]
    },
    {
      id: "m3",
      title: "Echoes of Tomorrow",
      genre: "Action / Thriller",
      duration: "130 min",
      rating: "PG-13",
      showtimes: ["12:45 PM", "3:45 PM", "6:30 PM", "9:15 PM"]
    }
  ],
  seatRows: [
    { row: "A", seats: 10 },
    { row: "B", seats: 10 },
    { row: "C", seats: 10 },
    { row: "D", seats: 10 },
    { row: "E", seats: 10 }
  ],
  ticketPrice: 12.50
};

// --- Global Prototype State ---
let appData = fallbackData;
let currentStep = 1;
const bookingState = {
  movie: null,
  cinema: "",
  date: "",
  showtime: "",
  userEmail: "",
  authType: "guest",
  selectedSeats: ["C4", "C5", "C6"], // Initialized with seats shaded in the sketch
  ticketPrice: 12.50
};

// Occupied seats list for simulation
const occupiedSeats = ["A2", "A3", "B7", "B8", "E1", "E2"];

// --- Wait for DOM Ready ---
document.addEventListener("DOMContentLoaded", () => {
  loadFillerData();
  setupStepNavigation();
  setupStep1Controls();
  setupStep2Controls();
  setupStep3Controls();
});

// --- 1. Load Local JSON Data ---
function loadFillerData() {
  fetch("data/content.json")
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then(data => {
      appData = data;
      renderApp();
    })
    .catch(() => {
      // Graceful fallback if opened via file:// protocol
      console.log("Using local fallback filler data.");
      appData = fallbackData;
      renderApp();
    });
}

function renderApp() {
  populateDropdowns();
  renderMovieCards();
  renderSeatGrid();
  updateSummary();
}

// --- 2. Step Navigation Logic ---
function setupStepNavigation() {
  const tabs = document.querySelectorAll(".step-tab");
  const prevBtn = document.getElementById("btn-prev-step");
  const nextBtn = document.getElementById("btn-next-step");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const step = parseInt(tab.getAttribute("data-step"), 10);
      goToStep(step);
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentStep > 1) goToStep(currentStep - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentStep < 3) goToStep(currentStep + 1);
    });
  }
}

function goToStep(stepNumber) {
  // Track step transition time for usability testing analytics
  if (stepNumber !== currentStep && window.Analytics && typeof window.Analytics.recordStepTransition === "function") {
    window.Analytics.recordStepTransition(currentStep, stepNumber);
  }

  currentStep = stepNumber;

  // Toggle active screen
  document.querySelectorAll(".step-screen").forEach(screen => {
    screen.classList.remove("active");
  });
  const activeScreen = document.getElementById(`step-${stepNumber}-screen`);
  if (activeScreen) activeScreen.classList.add("active");

  // Toggle active tab
  document.querySelectorAll(".step-tab").forEach(tab => {
    const tabStep = parseInt(tab.getAttribute("data-step"), 10);
    tab.classList.toggle("active", tabStep === stepNumber);
  });

  // Update nav buttons disabled states
  const prevBtn = document.getElementById("btn-prev-step");
  const nextBtn = document.getElementById("btn-next-step");
  if (prevBtn) prevBtn.disabled = currentStep === 1;
  if (nextBtn) nextBtn.disabled = currentStep === 3;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- 3. Step 1 (Browse & Filters) Logic ---
function populateDropdowns() {
  const cinemaSelect = document.getElementById("filter-cinema");
  const dateSelect = document.getElementById("filter-date");
  const movieSelect = document.getElementById("filter-movie");

  // Cinemas
  if (cinemaSelect) {
    cinemaSelect.innerHTML = appData.cinemas
      .map(c => `<option value="${c}">${c}</option>`)
      .join("");
    bookingState.cinema = appData.cinemas[0];
    cinemaSelect.addEventListener("change", e => {
      bookingState.cinema = e.target.value;
      if (window.Analytics) window.Analytics.recordSelection("cinema", e.target.value);
      updateSummary();
    });
  }

  // Dates
  if (dateSelect) {
    dateSelect.innerHTML = appData.dates
      .map(d => `<option value="${d}">${d}</option>`)
      .join("");
    bookingState.date = appData.dates[0];
    dateSelect.addEventListener("change", e => {
      bookingState.date = e.target.value;
      if (window.Analytics) window.Analytics.recordSelection("date", e.target.value);
      updateSummary();
    });
  }

  // Movies
  if (movieSelect) {
    movieSelect.innerHTML = appData.movies
      .map(m => `<option value="${m.id}">${m.title}</option>`)
      .join("");
    bookingState.movie = appData.movies[0];
    bookingState.showtime = appData.movies[0].showtimes[0];
    movieSelect.addEventListener("change", e => {
      const selected = appData.movies.find(m => m.id === e.target.value);
      if (selected) {
        bookingState.movie = selected;
        bookingState.showtime = selected.showtimes[0];
        highlightSelectedMovieCard(selected.id);
        if (window.Analytics) {
          window.Analytics.recordSelection("movie", selected.title);
          window.Analytics.recordSelection("showtime", selected.showtimes[0]);
        }
        updateSummary();
      }
    });
  }
}

function renderMovieCards() {
  const container = document.getElementById("movies-list");
  if (!container) return;

  container.innerHTML = "";

  appData.movies.forEach((movie, index) => {
    const card = document.createElement("div");
    card.className = `movie-card ${index === 0 ? "selected" : ""}`;
    card.id = `movie-card-${movie.id}`;

    // Generate showtime buttons
    const timesHtml = movie.showtimes
      .map((time, tIndex) => {
        const isSel = index === 0 && tIndex === 0;
        return `<button type="button" class="time-btn ${isSel ? "selected" : ""}" data-movie-id="${movie.id}" data-time="${time}">${time}</button>`;
      })
      .join("");

    card.innerHTML = `
      <div class="poster-placeholder">
        <span class="poster-placeholder-cross">☒</span>
        <span>[ Poster Placeholder ]</span>
      </div>
      <div class="movie-info">
        <h4>${movie.title}</h4>
        <div class="movie-meta">${movie.genre} • ${movie.duration} • ${movie.rating}</div>
        <div class="showtimes-label">Select Showtime:</div>
        <div class="showtimes-list">${timesHtml}</div>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach showtime click listeners
  container.querySelectorAll(".time-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const mId = btn.getAttribute("data-movie-id");
      const time = btn.getAttribute("data-time");
      selectShowtime(mId, time);
    });
  });
}

function selectShowtime(movieId, time) {
  const movie = appData.movies.find(m => m.id === movieId);
  if (!movie) return;

  bookingState.movie = movie;
  bookingState.showtime = time;

  // Track showtime selection in analytics
  if (window.Analytics) {
    window.Analytics.recordSelection("movie", movie.title);
    window.Analytics.recordSelection("showtime", time);
  }

  // Update movie dropdown
  const movieSelect = document.getElementById("filter-movie");
  if (movieSelect) movieSelect.value = movieId;

  highlightSelectedMovieCard(movieId);

  // Update button selection state
  document.querySelectorAll(".time-btn").forEach(b => {
    b.classList.remove("selected");
  });
  const activeBtn = document.querySelector(`.time-btn[data-movie-id="${movieId}"][data-time="${time}"]`);
  if (activeBtn) activeBtn.classList.add("selected");

  updateSummary();
}

function highlightSelectedMovieCard(movieId) {
  document.querySelectorAll(".movie-card").forEach(c => c.classList.remove("selected"));
  const card = document.getElementById(`movie-card-${movieId}`);
  if (card) card.classList.add("selected");
}

function setupStep1Controls() {
  const proceedBtn = document.getElementById("step1-continue-btn");
  if (proceedBtn) {
    proceedBtn.addEventListener("click", () => {
      goToStep(2);
    });
  }
}

// --- 4. Step 2 (Sign Up / Log In / Guest) Logic ---
function setupStep2Controls() {
  // Sign Up Form
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", e => {
      e.preventDefault();
      const email = document.getElementById("signup-email").value;
      bookingState.userEmail = email || "user@example.com";
      bookingState.authType = "registered";
      if (window.Analytics) window.Analytics.recordSelection("authType", "registered");
      syncEmailInput();
      goToStep(3);
    });
  }

  // Log In Form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", e => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      bookingState.userEmail = email || "user@example.com";
      bookingState.authType = "logged_in";
      if (window.Analytics) window.Analytics.recordSelection("authType", "logged_in");
      syncEmailInput();
      goToStep(3);
    });
  }

  // Sign In as Guest Button (matches middle sketch)
  const guestBtn = document.getElementById("btn-guest-signin");
  if (guestBtn) {
    guestBtn.addEventListener("click", () => {
      bookingState.authType = "guest";
      if (window.Analytics) window.Analytics.recordSelection("authType", "guest");
      goToStep(3);
    });
  }
}

function syncEmailInput() {
  const emailInput = document.getElementById("checkout-email");
  if (emailInput && bookingState.userEmail) {
    emailInput.value = bookingState.userEmail;
  }
}

// --- 5. Step 3 (Email, Seats & Payment) Logic ---
function setupStep3Controls() {
  const emailInput = document.getElementById("checkout-email");
  if (emailInput) {
    emailInput.addEventListener("input", e => {
      bookingState.userEmail = e.target.value;
    });
  }

  // Checkout Cart Button
  const checkoutBtn = document.getElementById("btn-checkout-submit");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      handleBookingSubmission();
    });
  }

  // Start Over Button
  const resetBtn = document.getElementById("btn-restart");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const confirmBox = document.getElementById("booking-confirmation");
      if (confirmBox) confirmBox.classList.remove("active");
      goToStep(1);
    });
  }
}

function renderSeatGrid() {
  const gridContainer = document.getElementById("seats-grid-container");
  if (!gridContainer) return;

  gridContainer.innerHTML = "";

  appData.seatRows.forEach(rowInfo => {
    const rowEl = document.createElement("div");
    rowEl.className = "seat-row";

    // Row Letter label
    const labelEl = document.createElement("span");
    labelEl.className = "row-label";
    labelEl.textContent = rowInfo.row;
    rowEl.appendChild(labelEl);

    // Seats in the row (with an aisle in middle after seat 5)
    for (let s = 1; s <= rowInfo.seats; s++) {
      if (s === 6) {
        const aisle = document.createElement("span");
        aisle.className = "aisle-gap";
        rowEl.appendChild(aisle);
      }

      const seatId = `${rowInfo.row}${s}`;
      const seatBtn = document.createElement("button");
      seatBtn.type = "button";
      seatBtn.className = "seat";
      seatBtn.setAttribute("data-seat-id", seatId);
      seatBtn.title = `Seat ${seatId}`;
      seatBtn.textContent = s;

      if (occupiedSeats.includes(seatId)) {
        seatBtn.classList.add("occupied");
        seatBtn.disabled = true;
      } else if (bookingState.selectedSeats.includes(seatId)) {
        seatBtn.classList.add("selected");
      }

      seatBtn.addEventListener("click", () => toggleSeat(seatId));
      rowEl.appendChild(seatBtn);
    }

    gridContainer.appendChild(rowEl);
  });
}

function toggleSeat(seatId) {
  if (occupiedSeats.includes(seatId)) return;

  const index = bookingState.selectedSeats.indexOf(seatId);
  if (index > -1) {
    bookingState.selectedSeats.splice(index, 1);
  } else {
    bookingState.selectedSeats.push(seatId);
  }

  // Update seat element classes
  const seatBtn = document.querySelector(`.seat[data-seat-id="${seatId}"]`);
  if (seatBtn) {
    seatBtn.classList.toggle("selected", bookingState.selectedSeats.includes(seatId));
  }

  // Track seat selection in analytics
  if (window.Analytics) {
    window.Analytics.recordSelection("seats", bookingState.selectedSeats);
  }

  updateSummary();
}

function updateSummary() {
  const summaryEl = document.getElementById("seat-summary-text");
  const count = bookingState.selectedSeats.length;
  const price = (count * bookingState.ticketPrice).toFixed(2);
  const seatsList = bookingState.selectedSeats.length > 0 ? bookingState.selectedSeats.join(", ") : "None";

  if (summaryEl) {
    summaryEl.textContent = `Selected Seats: ${seatsList} (${count} seat${count === 1 ? "" : "s"}) — Total: $${price}`;
  }
}

function handleBookingSubmission() {
  const emailInput = document.getElementById("checkout-email");
  const email = emailInput ? emailInput.value.trim() : "";

  if (!email) {
    alert("Please enter your email address to continue.");
    if (emailInput) emailInput.focus();
    return;
  }

  if (bookingState.selectedSeats.length === 0) {
    alert("Please pick at least one seat.");
    return;
  }

  const movieTitle = bookingState.movie ? bookingState.movie.title : "Movie";
  const showtime = bookingState.showtime || "Selected time";
  const cinema = bookingState.cinema || "Selected cinema";
  const total = (bookingState.selectedSeats.length * bookingState.ticketPrice).toFixed(2);

  const confirmBox = document.getElementById("booking-confirmation");
  const detailsEl = document.getElementById("confirmation-details");

  if (detailsEl) {
    detailsEl.innerHTML = `
      <strong>Movie:</strong> ${movieTitle}<br>
      <strong>Cinema:</strong> ${cinema}<br>
      <strong>Showtime:</strong> ${bookingState.date} @ ${showtime}<br>
      <strong>Seats:</strong> ${bookingState.selectedSeats.join(", ")}<br>
      <strong>Email:</strong> ${email}<br>
      <strong>Total Charged:</strong> $${total}
    `;
  }

  if (confirmBox) {
    confirmBox.classList.add("active");
    confirmBox.scrollIntoView({ behavior: "smooth" });
  }

  // Complete usability testing session in analytics
  if (window.Analytics && typeof window.Analytics.completeTest === "function") {
    window.Analytics.completeTest(bookingState);
  }
}

// Reset prototype back to default state for starting a fresh participant test
function resetBookingFlow() {
  if (appData && appData.movies && appData.movies.length > 0) {
    bookingState.movie = appData.movies[0];
    bookingState.showtime = appData.movies[0].showtimes[0];
    bookingState.cinema = appData.cinemas ? appData.cinemas[0] : "";
    bookingState.date = appData.dates ? appData.dates[0] : "";

    const movieSelect = document.getElementById("filter-movie");
    if (movieSelect) movieSelect.value = appData.movies[0].id;
    highlightSelectedMovieCard(appData.movies[0].id);
  }

  bookingState.userEmail = "";
  bookingState.authType = "guest";
  bookingState.selectedSeats = ["C4", "C5", "C6"];

  const signupForm = document.getElementById("signup-form");
  if (signupForm) signupForm.reset();

  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.reset();

  const checkoutEmail = document.getElementById("checkout-email");
  if (checkoutEmail) checkoutEmail.value = "guest@example.com";

  const confirmBox = document.getElementById("booking-confirmation");
  if (confirmBox) confirmBox.classList.remove("active");

  renderSeatGrid();
  updateSummary();
  goToStep(1);
}

// Expose functions for analytics module
window.goToStep = goToStep;
window.resetBookingFlow = resetBookingFlow;
