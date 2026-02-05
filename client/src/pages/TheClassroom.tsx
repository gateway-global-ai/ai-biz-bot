import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, Send, BookOpen, GraduationCap, 
  Presentation, Video, FileText, Lightbulb, Play, Pause,
  SkipBack, SkipForward, Maximize2, Clock, CheckCircle2,
  Loader2, Sparkles, Brain, Target, TrendingUp, Star, ThumbsUp
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { Agent, DiscScores } from '@shared/schema';

interface Slide {
  id: number;
  title: string;
  content: string;
  type: 'intro' | 'content' | 'video' | 'quiz' | 'summary';
  imageUrl?: string;
  videoUrl?: string;
  bulletPoints?: string[];
  quizQuestion?: string;
  quizOptions?: string[];
  quizAnswer?: number;
}

interface Lesson {
  id: string;
  topic: string;
  title: string;
  description: string;
  duration: string;
  slides: Slide[];
  status: 'generating' | 'ready' | 'in-progress' | 'completed';
  progress: number;
}

const defaultDiscScores: DiscScores = {
  dominance: 40,
  influence: 60,
  steadiness: 70,
  conscientiousness: 80
};

export default function TheClassroom() {
  const [, params] = useRoute('/agent/:agentId/classroom');
  const [, setLocation] = useLocation();
  const agentId = params?.agentId ? parseInt(params.agentId) : null;
  
  const [discScores, setDiscScores] = useState<DiscScores>(defaultDiscScores);
  const [topicInput, setTopicInput] = useState('');
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonHistory, setLessonHistory] = useState<Lesson[]>([]);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [lessonVersion, setLessonVersion] = useState(1);
  const [isNewLesson, setIsNewLesson] = useState(true);
  const [quizScores, setQuizScores] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ['/api/agents', agentId],
    enabled: !!agentId,
  });

  const { data: popularTopics } = useQuery<any[]>({
    queryKey: ['/api/classroom/popular-topics'],
  });

  useEffect(() => {
    if (agent) {
      setDiscScores({
        dominance: agent.dominance ?? 40,
        influence: agent.influence ?? 60,
        steadiness: agent.steadiness ?? 70,
        conscientiousness: agent.conscientiousness ?? 80
      });
    }
  }, [agent]);

  const generateLesson = async (topic: string) => {
    setIsGenerating(true);
    
    const newLesson: Lesson = {
      id: Date.now().toString(),
      topic,
      title: `Understanding ${topic}`,
      description: `A comprehensive lesson on ${topic} curated by ${agent?.name || 'your AI tutor'}`,
      duration: '15-20 min',
      status: 'generating',
      progress: 0,
      slides: []
    };
    
    setCurrentLesson(newLesson);

    try {
      const response = await apiRequest('POST', '/api/classroom/lesson', { topic });
      const data = await response.json();
      
      if (!data.lesson) {
        throw new Error('Failed to generate lesson');
      }

      const lessonData = data.lesson;
      const syllabus = lessonData.syllabus || [];
      const initialContent = lessonData.initialContent || {};
      const quiz = lessonData.quiz || [];

      const generatedSlides: Slide[] = [
        {
          id: 1,
          title: initialContent.title || `Welcome to ${topic}`,
          content: initialContent.content || `In this lesson, we'll explore ${topic}.`,
          type: 'intro',
          bulletPoints: initialContent.bulletPoints || syllabus.map((s: any) => s.title)
        },
        ...syllabus.slice(0, 5).map((item: any, index: number) => ({
          id: index + 2,
          title: item.title,
          content: item.description,
          type: 'content' as const,
          bulletPoints: []
        })),
        ...quiz.slice(0, 3).map((q: any, index: number) => ({
          id: syllabus.length + index + 2,
          title: `Knowledge Check ${index + 1}`,
          content: 'Test your understanding with this question.',
          type: 'quiz' as const,
          quizQuestion: q.question,
          quizOptions: q.options,
          quizAnswer: q.correctAnswerIndex
        })),
        {
          id: syllabus.length + quiz.length + 2,
          title: 'Lesson Complete',
          content: `Congratulations! You've completed the lesson on ${topic}.`,
          type: 'summary',
          bulletPoints: [
            'You learned the core concepts using the WHY framework',
            'You explored real-world applications',
            'You tested your knowledge',
            `This lesson will improve based on your feedback!`
          ]
        }
      ];
      
      newLesson.id = lessonData.id;
      newLesson.slides = generatedSlides;
      newLesson.status = 'ready';
      newLesson.title = lessonData.title || `Understanding ${topic}`;
      
      setCurrentLesson({ ...newLesson });
      setLessonHistory(prev => [newLesson, ...prev]);
      setCurrentSlideIndex(0);
      setLessonVersion(data.version || 1);
      setIsNewLesson(data.isNew);
    } catch (error: any) {
      console.error('Lesson generation error:', error);
      newLesson.status = 'ready';
      newLesson.slides = [{
        id: 1,
        title: 'Generation Error',
        content: `Unable to generate lesson: ${error.message}. Please try again.`,
        type: 'intro',
        bulletPoints: []
      }];
      setCurrentLesson({ ...newLesson });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartLesson = () => {
    if (!topicInput.trim()) return;
    generateLesson(topicInput.trim());
    setTopicInput('');
  };

  const handleNextSlide = () => {
    if (currentLesson && currentSlideIndex < currentLesson.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      setSelectedQuizAnswer(null);
      setQuizSubmitted(false);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
      setSelectedQuizAnswer(null);
      setQuizSubmitted(false);
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    if (currentSlide && selectedQuizAnswer !== null) {
      const isCorrect = selectedQuizAnswer === currentSlide.quizAnswer;
      setQuizScores(prev => [...prev, isCorrect ? 100 : 0]);
    }
  };

  const handleLessonComplete = async () => {
    if (!currentLesson) return;
    
    const avgScore = quizScores.length > 0 
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : null;
    
    try {
      const response = await apiRequest('POST', '/api/classroom/complete', {
        lessonPlanId: currentLesson.id,
        quizScore: avgScore,
        slidesViewed: currentSlideIndex + 1,
        totalSlides: currentLesson.slides.length,
        feedback: feedback || undefined,
      });
      
      const result = await response.json();
      
      setCurrentLesson(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
      setQuizScores([]);
      setFeedback('');
      
      if (result.improved) {
        setLessonVersion(result.newVersion || lessonVersion + 1);
        alert(`Great news! Based on feedback from you and others, this lesson has been automatically improved to version ${result.newVersion}. Future learners will benefit from an enhanced experience!`);
      }
    } catch (error) {
      console.error('Failed to record completion:', error);
    }
  };

  const currentSlide = currentLesson?.slides[currentSlideIndex];
  const progress = currentLesson ? ((currentSlideIndex + 1) / currentLesson.slides.length) * 100 : 0;
  const isLastSlide = currentLesson && currentSlideIndex === currentLesson.slides.length - 1;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900/20 via-background to-orange-900/20 flex items-center justify-center">
        <div className="animate-pulse text-amber-400">Loading classroom...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900/20 via-background to-orange-900/20">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/agents')}
            className="text-amber-400 hover:text-amber-300"
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-400">The Classroom</h1>
              <p className="text-sm text-muted-foreground">
                Learn with {agent?.name || 'Your AI Tutor'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {!currentLesson ? (
              <Card className="border-amber-500/30 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-400">
                    <Lightbulb className="w-5 h-5" />
                    What would you like to learn?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-2">
                    <Input
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="Enter a topic... (e.g., Machine Learning, Guitar Basics, Japanese Cuisine)"
                      className="flex-1 bg-background/50 border-amber-500/30"
                      onKeyDown={(e) => e.key === 'Enter' && handleStartLesson()}
                      data-testid="input-topic"
                    />
                    <Button 
                      onClick={handleStartLesson}
                      disabled={!topicInput.trim() || isGenerating}
                      className="bg-amber-600 hover:bg-amber-500"
                      data-testid="button-start-lesson"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create Lesson
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card 
                      className="border-amber-500/20 hover-elevate cursor-pointer"
                      onClick={() => setTopicInput('Introduction to AI and Machine Learning')}
                      data-testid="card-suggestion-ai"
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <Brain className="w-8 h-8 text-amber-500 shrink-0" />
                        <div>
                          <h3 className="font-medium text-sm">AI & Machine Learning</h3>
                          <p className="text-xs text-muted-foreground">Fundamentals of artificial intelligence</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="border-amber-500/20 hover-elevate cursor-pointer"
                      onClick={() => setTopicInput('Effective Communication Skills')}
                      data-testid="card-suggestion-communication"
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <Target className="w-8 h-8 text-orange-500 shrink-0" />
                        <div>
                          <h3 className="font-medium text-sm">Communication Skills</h3>
                          <p className="text-xs text-muted-foreground">Master the art of effective dialogue</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="border-amber-500/20 hover-elevate cursor-pointer"
                      onClick={() => setTopicInput('Personal Finance Basics')}
                      data-testid="card-suggestion-finance"
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <BookOpen className="w-8 h-8 text-yellow-500 shrink-0" />
                        <div>
                          <h3 className="font-medium text-sm">Personal Finance</h3>
                          <p className="text-xs text-muted-foreground">Build wealth and manage money</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {lessonHistory.length > 0 && (
                    <div className="pt-4 border-t border-amber-500/20">
                      <h3 className="text-sm font-medium text-amber-400 mb-3">Recent Lessons</h3>
                      <div className="space-y-2">
                        {lessonHistory.slice(0, 3).map((lesson) => (
                          <div 
                            key={lesson.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-background/30 hover-elevate cursor-pointer"
                            onClick={() => {
                              setCurrentLesson(lesson);
                              setCurrentSlideIndex(0);
                            }}
                            data-testid={`lesson-history-${lesson.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Presentation className="w-5 h-5 text-amber-500" />
                              <div>
                                <p className="text-sm font-medium">{lesson.title}</p>
                                <p className="text-xs text-muted-foreground">{lesson.duration}</p>
                              </div>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-500/30 bg-card/80 backdrop-blur overflow-hidden">
                <div className="h-1 bg-amber-900/30">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Presentation className="w-5 h-5 text-amber-400" />
                      <CardTitle className="text-lg">{currentLesson.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{currentLesson.duration}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Slide {currentSlideIndex + 1} of {currentLesson.slides.length}
                  </p>
                </CardHeader>
                
                <CardContent className="p-0">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-96 gap-4">
                      <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                      <p className="text-amber-400">Curating your personalized lesson...</p>
                    </div>
                  ) : currentSlide && (
                    <div className="p-6 min-h-96">
                      <div className={`
                        ${currentSlide.type === 'intro' ? 'text-center' : ''}
                        ${currentSlide.type === 'summary' ? 'text-center' : ''}
                      `}>
                        <h2 className={`text-2xl font-bold mb-4 ${
                          currentSlide.type === 'intro' || currentSlide.type === 'summary' 
                            ? 'text-amber-400' : ''
                        }`}>
                          {currentSlide.title}
                        </h2>
                        
                        <p className="text-muted-foreground mb-6">{currentSlide.content}</p>
                        
                        {currentSlide.bulletPoints && (
                          <ul className={`space-y-3 ${
                            currentSlide.type === 'intro' || currentSlide.type === 'summary'
                              ? 'text-left max-w-md mx-auto' : ''
                          }`}>
                            {currentSlide.bulletPoints.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {currentSlide.type === 'video' && currentSlide.videoUrl && (
                          <div className="aspect-video rounded-lg overflow-hidden bg-black/50 flex items-center justify-center">
                            <div className="text-center">
                              <Video className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                              <p className="text-muted-foreground">Video content would appear here</p>
                              <Button className="mt-4 bg-amber-600 hover:bg-amber-500">
                                <Play className="w-4 h-4 mr-2" />
                                Play Video
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {currentSlide.type === 'quiz' && (
                          <div className="max-w-lg mx-auto text-left">
                            <p className="font-medium mb-4">{currentSlide.quizQuestion}</p>
                            <div className="space-y-2">
                              {currentSlide.quizOptions?.map((option, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => !quizSubmitted && setSelectedQuizAnswer(idx)}
                                  disabled={quizSubmitted}
                                  className={`w-full p-3 rounded-lg text-left transition-all ${
                                    selectedQuizAnswer === idx
                                      ? quizSubmitted
                                        ? idx === currentSlide.quizAnswer
                                          ? 'bg-green-500/20 border-green-500'
                                          : 'bg-red-500/20 border-red-500'
                                        : 'bg-amber-500/20 border-amber-500'
                                      : quizSubmitted && idx === currentSlide.quizAnswer
                                        ? 'bg-green-500/20 border-green-500'
                                        : 'bg-background/50 border-transparent hover:bg-amber-500/10'
                                  } border`}
                                  data-testid={`quiz-option-${idx}`}
                                >
                                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                                  {option}
                                </button>
                              ))}
                            </div>
                            {!quizSubmitted && selectedQuizAnswer !== null && (
                              <Button 
                                onClick={handleQuizSubmit}
                                className="mt-4 bg-amber-600 hover:bg-amber-500"
                                data-testid="button-submit-quiz"
                              >
                                Submit Answer
                              </Button>
                            )}
                            {quizSubmitted && (
                              <div className={`mt-4 p-3 rounded-lg ${
                                selectedQuizAnswer === currentSlide.quizAnswer
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {selectedQuizAnswer === currentSlide.quizAnswer
                                  ? 'Correct! Great job!'
                                  : 'Not quite. The correct answer is highlighted above.'}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {currentSlide.type === 'summary' && (
                          <div className="mt-6 max-w-md mx-auto space-y-4">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                v{lessonVersion}
                              </Badge>
                              {!isNewLesson && (
                                <Badge variant="outline" className="border-green-500/50 text-green-400">
                                  <Star className="w-3 h-3 mr-1" />
                                  Improved Lesson
                                </Badge>
                              )}
                            </div>
                            
                            {quizScores.length > 0 && (
                              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                                <p className="text-sm text-muted-foreground">Your Quiz Score</p>
                                <p className="text-2xl font-bold text-amber-400">
                                  {Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)}%
                                </p>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">
                                Help improve this lesson (optional)
                              </Label>
                              <Input
                                placeholder="What could be better?"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="border-amber-500/30"
                                data-testid="input-feedback"
                              />
                            </div>
                            
                            <Button
                              onClick={handleLessonComplete}
                              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
                              data-testid="button-complete-lesson"
                            >
                              <ThumbsUp className="w-4 h-4 mr-2" />
                              Complete Lesson
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-4 border-t border-amber-500/20 bg-background/30">
                    <Button
                      variant="outline"
                      onClick={handlePrevSlide}
                      disabled={currentSlideIndex === 0}
                      className="border-amber-500/30"
                      data-testid="button-prev-slide"
                    >
                      <SkipBack className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    
                    <div className="flex gap-1">
                      {currentLesson.slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentSlideIndex 
                              ? 'bg-amber-500 w-4' 
                              : idx < currentSlideIndex
                                ? 'bg-amber-500/50'
                                : 'bg-amber-900/30'
                          }`}
                          data-testid={`slide-dot-${idx}`}
                        />
                      ))}
                    </div>
                    
                    {currentSlideIndex === currentLesson.slides.length - 1 ? (
                      <Button
                        onClick={() => {
                          setCurrentLesson(null);
                          setCurrentSlideIndex(0);
                        }}
                        className="bg-amber-600 hover:bg-amber-500"
                        data-testid="button-finish-lesson"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Finish
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNextSlide}
                        className="bg-amber-600 hover:bg-amber-500"
                        data-testid="button-next-slide"
                      >
                        Next
                        <SkipForward className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-amber-500/30 bg-card/80 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                  <GraduationCap className="w-4 h-4" />
                  Teaching Style
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Pace</span>
                    <span className="text-amber-400">{discScores.dominance}%</span>
                  </div>
                  <Slider
                    value={[discScores.dominance]}
                    onValueChange={([v]) => setDiscScores(prev => ({ ...prev, dominance: v }))}
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-amber-500"
                    data-testid="slider-pace"
                  />
                  <p className="text-xs text-muted-foreground">
                    {discScores.dominance > 70 ? 'Fast-paced' : discScores.dominance > 40 ? 'Balanced' : 'Thorough'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Engagement</span>
                    <span className="text-orange-400">{discScores.influence}%</span>
                  </div>
                  <Slider
                    value={[discScores.influence]}
                    onValueChange={([v]) => setDiscScores(prev => ({ ...prev, influence: v }))}
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-orange-500"
                    data-testid="slider-engagement"
                  />
                  <p className="text-xs text-muted-foreground">
                    {discScores.influence > 70 ? 'Interactive' : discScores.influence > 40 ? 'Conversational' : 'Focused'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Depth</span>
                    <span className="text-yellow-400">{discScores.steadiness}%</span>
                  </div>
                  <Slider
                    value={[discScores.steadiness]}
                    onValueChange={([v]) => setDiscScores(prev => ({ ...prev, steadiness: v }))}
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-yellow-500"
                    data-testid="slider-depth"
                  />
                  <p className="text-xs text-muted-foreground">
                    {discScores.steadiness > 70 ? 'In-depth' : discScores.steadiness > 40 ? 'Balanced' : 'Overview'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Detail</span>
                    <span className="text-amber-300">{discScores.conscientiousness}%</span>
                  </div>
                  <Slider
                    value={[discScores.conscientiousness]}
                    onValueChange={([v]) => setDiscScores(prev => ({ ...prev, conscientiousness: v }))}
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-amber-300"
                    data-testid="slider-detail"
                  />
                  <p className="text-xs text-muted-foreground">
                    {discScores.conscientiousness > 70 ? 'Precise' : discScores.conscientiousness > 40 ? 'Practical' : 'High-level'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-card/80 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-400">
                  <BookOpen className="w-4 h-4" />
                  Learning Format
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10">
                  <Presentation className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Slides</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10">
                  <Video className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Videos</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10">
                  <FileText className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Quizzes</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                </div>
              </CardContent>
            </Card>

            {agent && (
              <Card className="border-amber-500/30 bg-card/80 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                      {agent.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">Your AI Tutor</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
