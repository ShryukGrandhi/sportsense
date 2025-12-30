import React, { useState, useRef, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import ScoreCard from './cards/ScoreCard';
import TopPlayersSection from './cards/TopPlayersSection';
import { pulseAIAPI } from '../services/api';

const PulseAI = ({ onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('live-audio');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const demoResult = {
    acr_result: {
      game_id: 'nfl_2025_sea_tb_week5',
      timestamp_offset: 1789.0,
      latency_ms: 47.3,
      confidence: 0.98
    },
    features: {
      team_name: 'Seahawks',
      player: 'Jaxon Smith-Njigba',
      metric_id: 'touchdown',
      situation: 'score_differential_trailing',
      game_context: {
        quarter: 2,
        time_remaining: '0:06',
        score_home: 7,
        score_away: 13,
        score_differential: -6,
        game_phase: 'end_of_half',
        momentum: 'critical'
      }
    },
    narrative: {
      text: 'Touchdown Seahawks! With just six seconds left in the first half, Sam Darnold connects with Jaxon Smith-Njigba in the end zone for a 6-yard touchdown! The third-year receiver makes the catch to cut the Buccaneers lead to 13-7 heading into halftime at Lumen Field!',
      latency_ms: 285.7,
      perplexity_score: 11.2
    },
    voice: {
      format: 'audio/mpeg',
      sample_rate: 44100,
      latency_ms: 79.4
    },
    total_latency_ms: 412.4
  };

  // Mock game data for ScoreCard (Live stats at halftime)
  const gameData = {
    teams: [
      {
        name: 'Seattle Seahawks',
        logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
        score: 7,
        stats: {
          points: 7,
          yards: 168,
          touchdowns: 1,
          completionPct: 87.5
        }
      },
      {
        name: 'Tampa Bay Buccaneers',
        logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
        score: 13,
        stats: {
          points: 13,
          yards: 192,
          touchdowns: 1,
          completionPct: 71.4
        }
      }
    ],
    meta: {
      status: 'Live - Halftime',
      date: '2025-10-05',
      venue: 'Lumen Field'
    }
  };

  // Mock top players data (Live game stats - First Half)
  const topPlayersData = [
    {
      name: 'Seattle Seahawks',
      logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
      topPlayers: [
        {
          playerName: 'Sam Darnold',
          playerPosition: 'QB',
          impact_score: 11.9,
          stats: {
            'CMP/ATT': '12/17',
            'YDS': '119',
            'TD': '1'
          },
          categories: [
            { name: 'CMP/ATT', value: '12/17' },
            { name: 'YDS', value: '119' },
            { name: 'TD', value: '1' }
          ]
        },
        {
          playerName: 'Jaxon Smith-Njigba',
          playerPosition: 'WR',
          impact_score: 9.5,
          stats: {
            'REC': '4',
            'YDS': '35',
            'TD': '1'
          },
          categories: [
            { name: 'REC', value: '4' },
            { name: 'YDS', value: '35' },
            { name: 'TD', value: '1' }
          ]
        }
      ]
    },
    {
      name: 'Tampa Bay Buccaneers',
      logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
      topPlayers: [
        {
          playerName: 'Baker Mayfield',
          playerPosition: 'QB',
          impact_score: 5.2,
          stats: {
            'CMP/ATT': '14/19',
            'YDS': '130',
            'TD': '0'
          },
          categories: [
            { name: 'CMP/ATT', value: '14/19' },
            { name: 'YDS', value: '130' },
            { name: 'TD', value: '0' }
          ]
        },
        {
          playerName: 'Emeka Egbuka',
          playerPosition: 'WR',
          impact_score: 3.3,
          stats: {
            'REC': '2',
            'YDS': '33',
            'TD': '0'
          },
          categories: [
            { name: 'REC', value: '2' },
            { name: 'YDS', value: '33' },
            { name: 'TD', value: '0' }
          ]
        }
      ]
    }
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const startRecording = async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Process audio with Pulse AI
        try {
          const response = await pulseAIAPI.recognize(audioBlob);
          setResult(response);
          
          // If voice audio is available, create URL for playback
          if (response.voice?.audio_data) {
            const audioData = response.voice.audio_data;
            const blob = new Blob([audioData], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            setAudioURL(url);
          }
          
          setShowResults(true);
        } catch (err) {
          console.error('Pulse AI recognition error:', err);
          setError(err.response?.data?.detail || err.message || 'Recognition failed. Please try again.');
        }
      };

      // Start recording
      mediaRecorder.start();
      setIsListening(true);
      setShowResults(false);
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 5000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access denied. Please allow microphone access and try again.');
      setIsListening(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
    
    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleRecognize = async () => {
    if (isListening) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] animate-slide-up" style={{ maxHeight: '100%' }}>
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="text-center flex-1">
            <h1 className="text-5xl font-light text-white tracking-tight mb-3">Pulse AI</h1>
            <div className="h-px w-16 bg-white mx-auto mb-6"></div>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Real-Time Sports Recognition</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#111111] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </header>

        {/* Sport Categories */}
        <div className="flex gap-2 justify-center mb-12 flex-wrap">
          {['Live Audio', 'NFL', 'NBA', 'MLB', 'NCAA', 'NHL', 'Soccer'].map(sport => (
            <button
              key={sport}
              onClick={() => setActiveTab(sport.toLowerCase().replace(' ', '-'))}
              className={`px-6 py-2.5 text-xs font-medium uppercase tracking-wider cursor-pointer transition-all border ${
                activeTab === sport.toLowerCase().replace(' ', '-')
                  ? 'bg-white text-[#0a0a0a] border-white'
                  : 'bg-transparent text-gray-600 border-[#1a1a1a] hover:border-white/30 hover:text-white'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-[#111111] border border-[#1a1a1a] p-12 mb-6">
          {/* Shazam Button */}
          <div className="flex flex-col items-center justify-center py-16 min-h-[400px]">
            <button
              onClick={handleRecognize}
              className={`w-56 h-56 border-2 border-white flex items-center justify-center cursor-pointer transition-all duration-300 rounded-full hover:scale-105 active:scale-95 ${
                isListening ? 'animate-button-pulse' : ''
              }`}
              style={{
                transform: isListening ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Waveform SVG */}
              <svg viewBox="0 0 120 60" className="w-24 h-24">
                <circle cx="8" cy="30" r="2.5" fill="white" opacity="0.4"/>
                <circle cx="16" cy="30" r="2.5" fill="white" opacity="0.5"/>
                <circle cx="24" cy="30" r="2.5" fill="white" opacity="0.6"/>

                <rect x="32" y="20" width="4" height="20" rx="2" fill="white" opacity="0.7"
                      className={isListening ? 'animate-pulse' : ''} style={isListening ? { animationDelay: '0s' } : {}}/>
                <rect x="40" y="15" width="4" height="30" rx="2" fill="white" opacity="0.8"
                      className={isListening ? 'animate-pulse' : ''} style={isListening ? { animationDelay: '0.1s' } : {}}/>
                <rect x="48" y="10" width="4" height="40" rx="2" fill="white" opacity="0.9"
                      className={isListening ? 'animate-pulse' : ''} style={isListening ? { animationDelay: '0.2s' } : {}}/>
                <rect x="56" y="5" width="4" height="50" rx="2" fill="white"
                      className={isListening ? 'animate-pulse' : ''} style={isListening ? { animationDelay: '0.3s' } : {}}/>
                <rect x="64" y="5" width="4" height="50" rx="2" fill="white"
                      className={isListening ? 'animate-pulse' : ''} style={isListening ? { animationDelay: '0.4s' } : {}}/>
                <rect x="72" y="10" width="4" height="40" rx="2" fill="white" opacity="0.9"
                      className={isListening ? 'animate-pulse' : ''} style={isListening ? { animationDelay: '0.2s' } : {}}/>
                <rect x="80" y="15" width="4" height="30" rx="2" fill="white" opacity="0.8"
                      className={isListening ? 'animate-pulse' : ''} style={isListening ? { animationDelay: '0.1s' } : {}}/>
                <rect x="88" y="20" width="4" height="20" rx="2" fill="white" opacity="0.7"
                      className={isListening ? 'animate-pulse' : ''} style={isListening ? { animationDelay: '0s' } : {}}/>

                <circle cx="96" cy="30" r="2.5" fill="white" opacity="0.6"/>
                <circle cx="104" cy="30" r="2.5" fill="white" opacity="0.5"/>
                <circle cx="112" cy="30" r="2.5" fill="white" opacity="0.4"/>
              </svg>
            </button>
            <p className={`mt-8 text-sm uppercase tracking-wider font-medium ${isListening ? 'text-white' : 'text-gray-600'}`}>
              {isListening ? 'Listening...' : 'Tap to listen to live game'}
            </p>

            {!showResults && (
              <div className="mt-12 bg-[#0a0a0a] border border-[#1a1a1a] px-8 py-6 max-w-xl">
                <h4 className="text-white font-medium mb-3 text-sm uppercase tracking-wider">Instant Game Recognition</h4>
                <p className="text-gray-600 text-xs leading-relaxed mb-2">Tap the circle to identify live sports moments in real-time.</p>
                <p className="text-gray-600 text-xs leading-relaxed">Powered by AI: ACR → Data → NLG → TTS</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-[#111111] border border-white/20">
            <p className="text-white text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-gray-600 uppercase tracking-wider hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results Section */}
        {showResults && result && (
          <div className="animate-slide-up">
            {/* AI Narrative - Moved to top */}
            <div className="p-8 bg-[#111111] border border-[#1a1a1a] mb-6 text-white text-base leading-relaxed">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-4">AI-Generated Broadcast Recap</div>
              <div className="font-light">{result.narrative?.text || demoResult.narrative.text}</div>
              
              {/* Audio Player if available */}
              {audioURL && (
                <div className="mt-6 pt-6 border-t border-[#1a1a1a]">
                  <audio controls className="w-full" src={audioURL}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              
              {/* Latency Metrics */}
              {result.total_latency_ms && (
                <div className="mt-4 pt-4 border-t border-[#1a1a1a] text-xs text-gray-600 uppercase tracking-wider">
                  Processed in {result.total_latency_ms.toFixed(1)}ms
                </div>
              )}
            </div>

              {/* Stats Profile - ScoreCard - Only show if we have game data from result */}
              {result.features && (
                <div className="mb-6">
                  <ScoreCard
                    teams={gameData.teams}
                    meta={gameData.meta}
                    title="Game Stats"
                    collapsible={false}
                  />
                </div>
              )}

              {/* Top Players Section - Only show if we have player data from result */}
              {result.features && (
                <div className="mb-6 bg-[#111111] border border-[#1a1a1a] p-10">
                  <TopPlayersSection teams={topPlayersData} />
                </div>
              )}
          </div>
        )}
        
        {/* Fallback to demo results if no result but showResults is true */}
        {showResults && !result && (
          <div className="animate-slide-up">
            <div className="p-8 bg-[#111111] border border-[#1a1a1a] mb-6 text-white text-base leading-relaxed">
              <div className="text-xs text-gray-600 uppercase tracking-wider mb-4">AI-Generated Broadcast Recap</div>
              <div className="font-light">{demoResult.narrative.text}</div>
            </div>
            <div className="mb-6">
              <ScoreCard
                teams={gameData.teams}
                meta={gameData.meta}
                title="Game Stats"
                collapsible={false}
              />
            </div>
            <div className="mb-6 bg-[#111111] border border-[#1a1a1a] p-10">
              <TopPlayersSection teams={topPlayersData} />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-gray-600 mt-12">
          <p className="text-xs uppercase tracking-wider">PLAYMAKER • Pulse AI • ACR, NLG, and TTS</p>
        </footer>
      </div>
    </div>
  );
};

export default PulseAI;
