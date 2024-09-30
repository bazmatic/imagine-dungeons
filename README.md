docker build -t imagine_dungeons_db .


docker stop imagine_dungeons
docker rm imagine_dungeons
docker run -d --name imagine_dungeons -p 5432:5432 imagine_dungeons_db
