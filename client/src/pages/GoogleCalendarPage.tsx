import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Calendar, Plus, Trash2, ExternalLink, Clock, MapPin,
  Loader2, RefreshCw, AlertCircle, Link2, ChevronLeft, ChevronRight
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  htmlLink?: string;
}

const BUSINESS_ID = 'default';

function isAllDayEvent(event: CalendarEvent): boolean {
  return !event.start.includes('T');
}

function formatEventTime(dateStr: string): string {
  if (!dateStr.includes('T')) return 'All day';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getEventColor(index: number): string {
  const colors = ['bg-blue-500/20 border-blue-500/40', 'bg-purple-500/20 border-purple-500/40', 'bg-emerald-500/20 border-emerald-500/40', 'bg-amber-500/20 border-amber-500/40', 'bg-rose-500/20 border-rose-500/40'];
  return colors[index % colors.length];
}

function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const startStr = event.start.includes('T') ? event.start : event.start + 'T00:00:00';
    const dateKey = new Date(startStr).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
  }
  return groups;
}

function toLocalDatetimeValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function GoogleCalendarPage() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    startTime: toLocalDatetimeValue(new Date()),
    endTime: toLocalDatetimeValue(new Date(Date.now() + 3600000)),
  });

  const startOfRange = new Date();
  startOfRange.setDate(startOfRange.getDate() + weekOffset * 7);
  startOfRange.setHours(0, 0, 0, 0);

  const connectionQuery = useQuery<{ connected: boolean }>({
    queryKey: [`/api/google/connection/${BUSINESS_ID}`],
  });

  const eventsQuery = useQuery<{ success: boolean; data: { events: CalendarEvent[] } }>({
    queryKey: ['/api/google/calendar/events', BUSINESS_ID, weekOffset],
    queryFn: async () => {
      const res = await fetch(`/api/google/calendar/events/${BUSINESS_ID}?maxResults=50&timeMin=${startOfRange.toISOString()}`);
      if (!res.ok) throw new Error('Failed to load events');
      return res.json();
    },
    enabled: connectionQuery.data?.connected === true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newEvent) => {
      return apiRequest('POST', `/api/google/calendar/events/${BUSINESS_ID}`, {
        summary: data.summary,
        description: data.description,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google/calendar/events', BUSINESS_ID] });
      setShowCreate(false);
      setNewEvent({
        summary: '',
        description: '',
        startTime: toLocalDatetimeValue(new Date()),
        endTime: toLocalDatetimeValue(new Date(Date.now() + 3600000)),
      });
      toast({ title: 'Event created' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create event', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest('DELETE', `/api/google/calendar/events/${BUSINESS_ID}/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google/calendar/events', BUSINESS_ID] });
      toast({ title: 'Event deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to delete event', description: err.message, variant: 'destructive' });
    },
  });

  const handleConnect = async () => {
    try {
      const res = await fetch(`/api/google/auth-url?businessId=${BUSINESS_ID}`);
      const data = await res.json();
      if (data.authUrl) window.location.href = data.authUrl;
    } catch {
      toast({ title: 'Connection failed', variant: 'destructive' });
    }
  };

  const isConnected = connectionQuery.data?.connected === true;
  const events = eventsQuery.data?.data?.events || [];
  const groupedEvents = groupEventsByDate(events);
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (connectionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-20">
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2" data-testid="text-calendar-connect-title">Connect Google Calendar</h2>
              <p className="text-slate-400 text-sm">
                Connect your Google account to view, create, and manage calendar events directly from this dashboard.
              </p>
            </div>
            <Button onClick={handleConnect} className="bg-blue-600" data-testid="button-connect-google-calendar">
              <Link2 className="w-4 h-4 mr-2" />
              Connect Google Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white" data-testid="text-calendar-title">Google Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/google/calendar/events', BUSINESS_ID] })}
            data-testid="button-refresh-events"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} data-testid="button-new-event">
            <Plus className="w-4 h-4 mr-1" /> New Event
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)} data-testid="button-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} data-testid="button-today">
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)} data-testid="button-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <span className="text-sm text-slate-400">
          {startOfRange.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} onwards
        </span>
      </div>

      {showCreate && (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-medium text-white">Create New Event</h3>
            <Input
              value={newEvent.summary}
              onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Event title"
              className="bg-slate-800 border-slate-600"
              data-testid="input-event-title"
            />
            <Textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description (optional)"
              className="bg-slate-800 border-slate-600 resize-none"
              rows={2}
              data-testid="input-event-description"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start</label>
                <Input
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                  data-testid="input-event-start"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">End</label>
                <Input
                  type="datetime-local"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                  className="bg-slate-800 border-slate-600"
                  data-testid="input-event-end"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => newEvent.summary && createMutation.mutate(newEvent)}
                disabled={!newEvent.summary || createMutation.isPending}
                data-testid="button-create-event"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Create Event
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {eventsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : eventsQuery.isError ? (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-slate-400">Failed to load events</p>
            <Button variant="outline" size="sm" onClick={() => eventsQuery.refetch()} data-testid="button-retry-events">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-12 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">No upcoming events</p>
            <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-empty-new-event">
              <Plus className="w-4 h-4 mr-1" /> Create an Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => (
            <div key={dateKey} className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider pl-1">
                {formatDateHeader(dateKey)}
              </h3>
              <div className="space-y-2">
                {groupedEvents[dateKey].map((event, idx) => (
                  <Card key={event.id} className={`border-l-2 ${getEventColor(idx)} bg-slate-900/60 border-slate-700`} data-testid={`event-card-${event.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">{event.summary}</h4>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="w-3 h-3" />
                              {isAllDayEvent(event) ? 'All day' : `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatEventDate(event.start)}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{event.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {event.htmlLink && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(event.htmlLink, '_blank')}
                              data-testid={`button-open-event-${event.id}`}
                            >
                              <ExternalLink className="w-4 h-4 text-slate-400" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete "${event.summary}"?`)) {
                                deleteMutation.mutate(event.id);
                              }
                            }}
                            data-testid={`button-delete-event-${event.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
