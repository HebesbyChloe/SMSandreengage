import { X, Sparkles, Brain, Zap } from 'lucide-react';

interface CustomerPanelProps {
  phoneNumber: string;
  onClose: () => void;
}

export function CustomerPanel({ phoneNumber, onClose }: CustomerPanelProps) {
  return (
    <div className="w-full sm:w-96 h-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white flex flex-col border-l border-purple-500/30 shadow-2xl relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse" 
             style={{ animationDuration: '6s', animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 sm:p-6 border-b border-purple-500/20 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                Customer Journey
              </h2>
              <p className="text-xs text-purple-300/70">AI-Powered Insights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Phone number display */}
        <div className="px-3 py-2 bg-white/5 rounded-lg border border-purple-500/20 backdrop-blur-sm">
          <p className="text-xs text-purple-300/70 mb-1">Contact</p>
          <p className="text-sm font-mono text-purple-200">{phoneNumber}</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Coming Soon Card */}
        <div className="relative bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-2xl p-6 border border-purple-500/30 backdrop-blur-xl overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" 
               style={{ 
                 backgroundSize: '200% 100%',
                 animation: 'shimmer 3s infinite'
               }} />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            {/* Animated icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 rounded-full filter blur-xl opacity-50 animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">Coming Soon</h3>
              <p className="text-sm text-purple-200/80 leading-relaxed">
                This feature will connect to your CRM's Customer Panel to provide AI-driven insights, journey analytics, and predictive recommendations.
              </p>
            </div>

            {/* Feature preview cards */}
            <div className="w-full space-y-2 mt-4">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-purple-400/20">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-200">Real-time sentiment analysis</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-blue-400/20">
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-200">AI conversation insights</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-purple-400/20">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-200">Predictive engagement scores</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-6 p-4 bg-black/20 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <p className="text-xs text-purple-300/70 text-center">
            🚀 Powered by advanced AI and machine learning
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}
