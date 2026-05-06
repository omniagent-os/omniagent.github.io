import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getConversations, deleteConversation, clearConversations } from "@/lib/storage";
import type { Conversation } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2, GitMerge, Clock } from "lucide-react";
import {
  AlertDialog as AlertDialogComponent,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

export default function History() {
  const [, navigate] = useLocation();
  const { settings } = useAppContext();
  const [conversations, setConversations] = useState<Conversation[]>(() => getConversations());

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
    setConversations(getConversations());
  };

  const handleClearAll = () => {
    clearConversations();
    setConversations([]);
  };

  const getModelsColor = (providerId: string) => {
    const p = settings.providers.find(p => p.id === providerId);
    return p?.color || "hsl(var(--muted-foreground))";
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} stored locally
          </p>
        </div>
        {conversations.length > 0 && (
          <AlertDialogComponent>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5" data-testid="button-clear-all">
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {conversations.length} conversations from your local storage. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogComponent>
        )}
      </div>

      {conversations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">No conversations yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Your synergy chat conversations will appear here, stored locally in your browser.
          </p>
          <Button onClick={() => navigate("/chat")} className="gap-2" data-testid="button-start-chat">
            <GitMerge className="w-4 h-4" />
            Start Synergy Chat
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv, i) => {
            const msgCount = conv.messages.length;
            const assistantMsgs = conv.messages.filter(m => m.role === "assistant").length;
            const totalModels = conv.modelsUsed.length;

            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-border bg-card hover:border-primary/20 transition-all cursor-pointer p-4"
                onClick={() => navigate(`/chat/${conv.id}`)}
                data-testid={`history-item-${conv.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                      <h3 className="font-medium text-sm truncate">{conv.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </span>
                      <span>{msgCount} messages</span>
                      <span>{assistantMsgs} synth{assistantMsgs !== 1 ? "eses" : "esis"}</span>
                    </div>
                    {totalModels > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {conv.modelsUsed.map(id => (
                          <div
                            key={id}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getModelsColor(id) }}
                            title={id}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {totalModels} model{totalModels !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                    onClick={(e) => handleDelete(conv.id, e)}
                    data-testid={`button-delete-history-${conv.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
