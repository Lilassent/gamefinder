import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import axios from 'axios';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './AuthPages.css';

interface Game {
  id: number;
  name: string;
  background_image: string;
}

const GameCarousel: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    axios
      .get(`https://api.rawg.io/api/games?key=03a7658b52384265a0017064bbbf3ba1&page_size=20`)
      .then((res) => {
        setGames(res.data.results);
      })
      .catch(console.error);
  }, []);

  const settings = {
    dots: false,
    infinite: true,
    autoplay: true,
    speed: 2000,
    autoplaySpeed: 4000,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
  };

  return (
    <div className="carousel-wrapper">
      <Slider {...settings}>
        {games.map((game) => (
          <div className="carousel-slide" key={game.id}>
            <img src={game.background_image} alt={game.name} className="carousel-image" />
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default GameCarousel;
