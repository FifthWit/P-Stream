import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Movie } from "@/pages/discover/common";

interface RandomMovieButtonProps {
  allMovies: Movie[];
}

export function RandomMovieButton({ allMovies }: RandomMovieButtonProps) {
  const [randomMovie, setRandomMovie] = useState<Movie | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownTimeout, setCountdownTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : prev));
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [countdown]);

  const handleRandomMovieClick = () => {
    const uniqueTitles = new Set(allMovies.map((movie) => movie.title));
    const uniqueTitlesArray = Array.from(uniqueTitles);
    const randomIndex = Math.floor(Math.random() * uniqueTitlesArray.length);
    const selectedMovie = allMovies.find(
      (movie) => movie.title === uniqueTitlesArray[randomIndex],
    );

    if (selectedMovie) {
      if (countdown !== null && countdown > 0) {
        setCountdown(null);
        if (countdownTimeout) {
          clearTimeout(countdownTimeout);
          setCountdownTimeout(null);
          setRandomMovie(null);
        }
      } else {
        setRandomMovie(selectedMovie);
        setCountdown(5);
        const timeoutId = setTimeout(() => {
          navigate(`/media/tmdb-movie-${selectedMovie.id}-discover-random`);
        }, 5000);
        setCountdownTimeout(timeoutId);
      }
    }
  };

  return (
    <div className="flex justify-center items-center">
      <button
        type="button"
        className="flex items-center space-x-2 rounded-full px-4 text-white py-2 bg-pill-background bg-opacity-50 hover:bg-pill-backgroundHover transition-[background,transform] duration-100 hover:scale-105"
        onClick={handleRandomMovieClick}
      >
        <div className="flex items-center space-x-2">
          <img
            src="/lightbar-images/dice.svg"
            alt="Dice"
            style={{ marginLeft: "8px" }}
          />
          {countdown !== null && countdown > 0 ? (
            <span className="font-bold">
              {randomMovie?.title} ({countdown})
            </span>
          ) : (
            <span className="font-bold">Random Movie</span>
          )}
        </div>
      </button>
    </div>
  );
}
