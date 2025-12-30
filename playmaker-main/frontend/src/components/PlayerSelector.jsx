import React, { useState, useEffect } from 'react';
import { Search, X, User, Plus } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PlayerSelector = ({ selectedPlayers, onPlayersChange, maxPlayers = 4, sport = 'NFL' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, sport]);

  const performSearch = async (query) => {
    setIsSearching(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/players/search`, {
        params: {
          query,
          sport,
          limit: 10
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSearchResults(response.data.players || []);
    } catch (err) {
      console.error('Error searching players:', err);
      setError('Failed to search players. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addPlayer = (player) => {
    if (selectedPlayers.length >= maxPlayers) {
      setError(`Maximum ${maxPlayers} players can be selected`);
      return;
    }

    // Check if player already selected
    const isAlreadySelected = selectedPlayers.some(p => p.id === player.id);
    if (isAlreadySelected) {
      setError('Player already selected');
      return;
    }

    onPlayersChange([...selectedPlayers, player]);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const removePlayer = (playerId) => {
    onPlayersChange(selectedPlayers.filter(p => p.id !== playerId));
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Selected Players */}
      {selectedPlayers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {selectedPlayers.map((player, index) => (
            <div
              key={player.id}
              className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 relative"
            >
              <button
                onClick={() => removePlayer(player.id)}
                className="absolute top-3 right-3 p-1 hover:bg-[#111111] transition-colors"
                aria-label="Remove player"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                {player.photo ? (
                  <img
                    src={player.photo}
                    alt={player.name}
                    className="w-12 h-12 border-2 border-white object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-12 h-12 border-2 border-white flex items-center justify-center text-white font-medium text-sm"
                  style={{ display: player.photo ? 'none' : 'flex' }}
                >
                  {player.name.charAt(0)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-white font-medium text-sm truncate">{player.name}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wider truncate">{player.team}</div>
                {player.position && (
                  <div className="text-xs text-gray-500">{player.position}</div>
                )}
              </div>
            </div>
          ))}

          {/* Add More Player Slots */}
          {selectedPlayers.length < maxPlayers &&
            Array.from({ length: maxPlayers - selectedPlayers.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="bg-[#111111] border-2 border-dashed border-[#1a1a1a] p-6 flex items-center justify-center"
              >
                <div className="text-center">
                  <Plus className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <div className="text-xs text-gray-600 uppercase tracking-wider">Add Player</div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search for ${sport} players...`}
            className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-[#1a1a1a] text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors text-sm font-light"
            disabled={selectedPlayers.length >= maxPlayers}
          />
        </div>

        {/* Search Results Dropdown */}
        {searchQuery.trim().length >= 2 && (
          <div className="absolute z-10 w-full mt-2 bg-[#111111] border border-[#1a1a1a] max-h-80 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-gray-600">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent mx-auto mb-2"></div>
                <div className="text-xs uppercase tracking-wider">Searching...</div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((player) => {
                  const isSelected = selectedPlayers.some(p => p.id === player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => !isSelected && addPlayer(player)}
                      disabled={isSelected}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected
                          ? 'bg-[#0a0a0a] cursor-not-allowed opacity-50'
                          : 'hover:bg-[#0a0a0a]'
                      }`}
                    >
                      {player.photo ? (
                        <img
                          src={player.photo}
                          alt={player.name}
                          className="w-10 h-10 border border-white object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="w-10 h-10 border border-white flex items-center justify-center text-white font-medium text-xs"
                        style={{ display: player.photo ? 'none' : 'flex' }}
                      >
                        {player.name.charAt(0)}
                      </div>

                      <div className="flex-1 text-left">
                        <div className="text-white font-medium text-sm">{player.name}</div>
                        <div className="text-xs text-gray-600 uppercase tracking-wider mt-0.5">
                          {player.team} {player.position && `• ${player.position}`}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="text-xs text-white font-medium uppercase tracking-wider">Selected</div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-600 text-xs uppercase tracking-wider">
                No players found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-[#111111] border border-white/20 text-white text-sm">
          {error}
        </div>
      )}

      {/* Info Text */}
      <div className="text-xs text-gray-600 text-center uppercase tracking-wider">
        {selectedPlayers.length === 0
          ? `Search and select ${maxPlayers} players to compare`
          : selectedPlayers.length < 2
          ? `Select at least one more player to start comparison`
          : `${selectedPlayers.length} of ${maxPlayers} players selected`}
      </div>
    </div>
  );
};

export default PlayerSelector;
